
// ==========================================
// FLORIONTECH - PAINEL DE MONITORAMENTO
// Temperatura automatica + agua + luz
// pH e fosforo continuam manuais
// ==========================================

const URL_SUPABASE =
  "https://gyqvgandakzakaywexav.supabase.co";

const CHAVE_PUBLICA =
  "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";

const DISPOSITIVO = "esp32-florion-01";

const db = supabase.createClient(
  URL_SUPABASE,
  CHAVE_PUBLICA
);

const $ = (id) => document.getElementById(id);

const popup = $("popupmanual");
const formulario = $("formDados");

const tiposManuais = new Set(["ph", "fosforo"]);

// ==========================================
// FUNCOES AUXILIARES
// ==========================================

function preencherDataAtual() {
  const hoje = new Date();

  const ano = hoje.getFullYear();
  const mes = String(
    hoje.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    hoje.getDate()
  ).padStart(2, "0");

  $("data").value = `${ano}-${mes}-${dia}`;
}

function texto(id, valor) {
  const el = $(id);

  if (el) {
    el.textContent = valor;
  }
}

function dataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR");
}

function leituraAntiga(iso) {
  const tempo = new Date(iso).getTime();

  return !Number.isFinite(tempo) ||
    Date.now() - tempo > 60000;
}

// ==========================================
// VERIFICACAO DE LOGIN
// ==========================================

async function usuarioLogado() {
  try {
    const { data, error } =
      await db.auth.getUser();

    if (error || !data?.user) {
      window.location.replace("login.html");
      return false;
    }

    return true;

  } catch (erro) {
    console.error(
      "Falha ao verificar login:",
      erro
    );

    texto(
      "mensagemPainel",
      "Não foi possível verificar o login."
    );

    return false;
  }
}

// ==========================================
// FORMULARIO MANUAL - pH E FOSFORO
// ==========================================

$("abrirPopup").addEventListener("click", () => {
  texto("mensagemFormulario", "");
  popup.showModal();
});

$("fecharpopup").addEventListener("click", () => {
  popup.close();
});

preencherDataAtual();

formulario.addEventListener(
  "submit",
  async (evento) => {
    evento.preventDefault();

    const tipo = $("tipo").value;
    const dataRegistro = $("data").value;
    const valorTexto = $("valor").value.trim();
    const valor = Number(valorTexto);

    if (
      !tiposManuais.has(tipo) ||
      !dataRegistro ||
      !valorTexto ||
      !Number.isFinite(valor)
    ) {
      texto(
        "mensagemFormulario",
        "Preencha os campos corretamente."
      );
      return;
    }

    $("botaoSalvar").disabled = true;
    texto("mensagemFormulario", "Salvando...");

    try {
      const { data: auth, error: erroAuth } =
        await db.auth.getUser();

      if (erroAuth || !auth?.user) {
        window.location.replace("login.html");
        return;
      }

      const { error } = await db
        .from("registros")
        .insert({
          data_registro: dataRegistro,
          tipo,
          valor
        });

      if (error) throw error;

      formulario.reset();
      preencherDataAtual();

      await carregarRegistros();
      popup.close();

    } catch (erro) {
      console.error("Erro ao salvar:", erro);

      texto(
        "mensagemFormulario",
        "Erro ao salvar: " + erro.message
      );

    } finally {
      $("botaoSalvar").disabled = false;
    }
  }
);

// ==========================================
// REGISTROS MANUAIS
// ==========================================

async function carregarRegistros() {
  try {
    const { data, error } = await db
      .from("registros")
      .select(
        "id, tipo, valor, data_registro, criado_em, nome_usuario"
      )
      .in("tipo", ["ph", "fosforo"])
      .order("data_registro", {
        ascending: false
      })
      .order("criado_em", {
        ascending: false
      })
      .order("id", {
        ascending: false
      });

    if (error) throw error;

    const ultimos = new Map();

    for (const registro of data || []) {
      if (!ultimos.has(registro.tipo)) {
        ultimos.set(registro.tipo, registro);
      }
    }

    const painel = $("painelRegistros");
    painel.replaceChildren();

    for (const registro of ultimos.values()) {
      const card = document.createElement("article");
      card.className = "card";

      const titulo = document.createElement("h3");
      titulo.textContent =
        registro.tipo === "ph" ? "pH" : "FÓSFORO";

      const valor = document.createElement("div");
      valor.className = "valor";
      valor.textContent = String(registro.valor);

      const detalhes = document.createElement("div");
      detalhes.className = "detalhes";

      const dataBR = registro.data_registro
        ? registro.data_registro
            .split("-")
            .reverse()
            .join("/")
        : "Sem data";

      detalhes.textContent =
        `Data: ${dataBR} | Cadastrado por: ${
          registro.nome_usuario || "Não informado"
        }`;

      card.append(titulo, valor, detalhes);
      painel.appendChild(card);
    }

    texto(
      "mensagemPainel",
      ultimos.size
        ? "Últimos registros manuais:"
        : "Nenhum registro manual de pH ou fósforo."
    );

  } catch (erro) {
    console.error("Erro nos registros manuais:", erro);

    texto(
      "mensagemPainel",
      "Erro ao carregar registros: " + erro.message
    );
  }
}

// ==========================================
// NOVO: TEMPERATURA AUTOMATICA
// ==========================================

async function carregarTemperatura() {
  try {
    const { data, error } = await db
      .from("leituras_temperatura_agua")
      .select("temperatura_c, criado_em")
      .eq("dispositivo", DISPOSITIVO)
      .order("criado_em", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      texto("temperaturaAgua", "-- °C");

      texto(
        "statusTemperatura",
        "Aguardando o primeiro envio do ESP32"
      );

      texto(
        "horarioTemperatura",
        "Nenhuma medição recebida"
      );

      return;
    }

    const temperatura = Number(data.temperatura_c);

    if (!Number.isFinite(temperatura)) {
      throw new Error(
        "Temperatura inválida no banco"
      );
    }

    texto(
      "temperaturaAgua",
      temperatura.toFixed(1).replace(".", ",") + " °C"
    );

    texto(
      "statusTemperatura",
      leituraAntiga(data.criado_em)
        ? "⚠️ Leitura antiga: confira o ESP32 e a conexão"
        : "Medição automática recebida do ESP32"
    );

    texto(
      "horarioTemperatura",
      "Última leitura: " + dataHora(data.criado_em)
    );

  } catch (erro) {
    console.error("Erro na temperatura:", erro);

    texto("temperaturaAgua", "-- °C");

    texto(
      "statusTemperatura",
      "Erro ao buscar temperatura no Supabase"
    );

    texto(
      "horarioTemperatura",
      erro.message || "Falha de conexão"
    );
  }
}

// ==========================================
// LUMINOSIDADE
// ==========================================

async function carregarLuminosidade() {
  try {
    const { data, error } = await db
      .from("leituras_luminosidade")
      .select("valor_bruto, criado_em")
      .eq("dispositivo", DISPOSITIVO)
      .order("criado_em", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      texto("valorLuminosidade", "--");
      texto("statusLuminosidade", "Sem leituras");

      texto(
        "horarioLuminosidade",
        "Aguardando dados do ESP32"
      );

      return;
    }

    texto(
      "valorLuminosidade",
      String(data.valor_bruto)
    );

    texto(
      "statusLuminosidade",
      leituraAntiga(data.criado_em)
        ? "⚠️ Sem leitura recente"
        : "Sensor de luminosidade recebendo dados"
    );

    texto(
      "horarioLuminosidade",
      "Última leitura: " + dataHora(data.criado_em)
    );

  } catch (erro) {
    console.error("Erro na luminosidade:", erro);

    texto("valorLuminosidade", "--");

    texto(
      "statusLuminosidade",
      "Erro ao carregar luminosidade"
    );

    texto(
      "horarioLuminosidade",
      erro.message || "Falha de conexão"
    );
  }
}

// ==========================================
// NIVEL DA AGUA
// ==========================================

function atualizarNivelAgua(inferior, superior) {
  texto(
    "sensorInferior",
    inferior ? "Molhado" : "Seco"
  );

  texto(
    "sensorSuperior",
    superior ? "Molhado" : "Seco"
  );

  if (!inferior && !superior) {
    texto("nivelAgua", "🟡 Água baixa");

  } else if (inferior && !superior) {
    texto("nivelAgua", "🟢 Nível normal");

  } else if (inferior && superior) {
    texto("nivelAgua", "🔴 Água alta");

  } else {
    texto(
      "nivelAgua",
      "⚠️ Verificar sensores"
    );
  }
}

async function carregarNivelAgua() {
  try {
    const { data, error } = await db
      .from("leituras_nivel_agua")
      .select(
        "sensor_inferior, sensor_superior, criado_em"
      )
      .eq("dispositivo", DISPOSITIVO)
      .order("criado_em", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      texto(
        "nivelAgua",
        "Aguardando leituras do ESP32"
      );

      texto("sensorInferior", "--");
      texto("sensorSuperior", "--");

      texto(
        "horarioNivel",
        "Nenhuma medição recebida"
      );

      return;
    }

    atualizarNivelAgua(
      data.sensor_inferior,
      data.sensor_superior
    );

    texto(
      "horarioNivel",
      "Última leitura: " +
        dataHora(data.criado_em) +
        (
          leituraAntiga(data.criado_em)
            ? " | ⚠️ Leitura antiga"
            : ""
        )
    );

  } catch (erro) {
    console.error(
      "Erro ao buscar nível da água:",
      erro
    );

    texto(
      "nivelAgua",
      "⚠️ Erro ao carregar nível da água"
    );

    texto("sensorInferior", "--");
    texto("sensorSuperior", "--");

    texto(
      "horarioNivel",
      erro.message || "Falha de conexão"
    );
  }
}

// ==========================================
// ATUALIZACAO AUTOMATICA
// ==========================================

async function atualizarTudo() {
  await Promise.all([
    carregarRegistros(),
    carregarTemperatura(),
    carregarLuminosidade(),
    carregarNivelAgua()
  ]);
}

$("atualizar").addEventListener(
  "click",
  atualizarTudo
);

$("sair").addEventListener(
  "click",
  async () => {
    const { error } = await db.auth.signOut();

    if (error) {
      texto(
        "mensagemPainel",
        "Erro ao sair: " + error.message
      );

      return;
    }

    window.location.replace("login.html");
  }
);

// ==========================================
// INICIALIZACAO
// ==========================================

async function iniciar() {
  if (!(await usuarioLogado())) return;

  await atualizarTudo();

  setInterval(
    carregarRegistros,
    30000
  );

  setInterval(
    carregarTemperatura,
    10000
  );

  setInterval(
    carregarLuminosidade,
    10000
  );

  setInterval(
    carregarNivelAgua,
    10000
  );
}

iniciar();
