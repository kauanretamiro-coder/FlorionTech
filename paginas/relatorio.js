
// FLORIONTECH - RELATORIOS COM GEMINI

const URL_SUPABASE =
  "https://gyqvgandakzakaywexav.supabase.co";

// Use a chave publishable do seu projeto.
const CHAVE_PUBLICA =
  "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";

const DISPOSITIVO = "esp32-florion-01";

const db = supabase.createClient(
  URL_SUPABASE,
  CHAVE_PUBLICA
);

const $ = id => document.getElementById(id);

function escrever(id, valor) {
  $(id).textContent = valor;
}

function horario(iso) {
  if (!iso) return "Sem horário";

  const data = new Date(iso);

  if (!Number.isFinite(data.getTime())) {
    return "Horário inválido";
  }

  const antigo =
    Date.now() - data.getTime() > 60000;

  return "Última leitura: " +
    data.toLocaleString("pt-BR") +
    (antigo ? " | Leitura antiga" : "");
}

// ====================================
// LEITURAS ATUAIS
// ====================================

async function carregarSensores() {
  escrever(
    "estadoSensores",
    "Consultando sensores..."
  );

  const consultas = [
    db.from("leituras_temperatura_agua")
      .select("temperatura_c, criado_em")
      .eq("dispositivo", DISPOSITIVO)
      .order("criado_em", {
        ascending: false
      })
      .limit(1)
      .maybeSingle(),

    db.from("leituras_nivel_agua")
      .select(
        "sensor_inferior, sensor_superior, criado_em"
      )
      .eq("dispositivo", DISPOSITIVO)
      .order("criado_em", {
        ascending: false
      })
      .limit(1)
      .maybeSingle(),

    db.from("leituras_luminosidade")
      .select("valor_bruto, criado_em")
      .eq("dispositivo", DISPOSITIVO)
      .order("criado_em", {
        ascending: false
      })
      .limit(1)
      .maybeSingle()
  ];

  try {
    const [temp, nivel, luz] =
      await Promise.all(consultas);

    const erros = [];

    // TEMPERATURA

    if (temp.error) {
      erros.push("temperatura");
    }

    if (!temp.error && temp.data) {
      const valor = Number(
        temp.data.temperatura_c
      );

      escrever(
        "temperatura",
        Number.isFinite(valor)
          ? valor.toFixed(1).replace(".", ",") + " °C"
          : "-- °C"
      );

      escrever(
        "horaTemperatura",
        horario(temp.data.criado_em)
      );
    } else {
      escrever("temperatura", "-- °C");
      escrever(
        "horaTemperatura",
        temp.error?.message || "Sem leituras"
      );
    }

    // NIVEL DA AGUA

    if (nivel.error) {
      erros.push("nível da água");
    }

    if (!nivel.error && nivel.data) {
      const inf = nivel.data.sensor_inferior;
      const sup = nivel.data.sensor_superior;

      let estado = "Verificar sensores";

      if (inf === false && sup === false) {
        estado = "Baixo";
      } else if (inf === true && sup === false) {
        estado = "Normal";
      } else if (inf === true && sup === true) {
        estado = "Alto";
      }

      escrever("nivelAgua", estado);
      escrever(
        "horaNivel",
        horario(nivel.data.criado_em)
      );
    } else {
      escrever("nivelAgua", "--");
      escrever(
        "horaNivel",
        nivel.error?.message || "Sem leituras"
      );
    }

    // LUMINOSIDADE

    if (luz.error) {
      erros.push("luminosidade");
    }

    if (!luz.error && luz.data) {
      escrever(
        "luminosidade",
        luz.data.valor_bruto + " / 4095"
      );

      escrever(
        "horaLuz",
        horario(luz.data.criado_em)
      );
    } else {
      escrever("luminosidade", "--");
      escrever(
        "horaLuz",
        luz.error?.message || "Sem leituras"
      );
    }

    escrever(
      "estadoSensores",
      erros.length
        ? "Erro na consulta: " + erros.join(", ")
        : "Dados consultados no Supabase."
    );

  } catch (erro) {
    console.error(erro);

    escrever(
      "estadoSensores",
      "Erro de conexão: " + erro.message
    );
  }
}

// ====================================
// EXIBIR RESULTADOS
// ====================================

function criarLista(id, itens) {
  const lista = $(id);

  lista.replaceChildren();

  if (!Array.isArray(itens) || itens.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum item informado.";
    lista.appendChild(li);
    return;
  }

  for (const item of itens) {
    const li = document.createElement("li");
    li.textContent = String(item);
    lista.appendChild(li);
  }
}

function mostrarRelatorio(dados) {
  const relatorio =
    dados?.relatorio || dados;

  if (
    !relatorio ||
    typeof relatorio.resumo !== "string"
  ) {
    throw new Error(
      "O servidor não retornou um relatório válido."
    );
  }

  escrever("resumoIA", relatorio.resumo);

  const risco = String(
    relatorio.nivel_risco || "indeterminado"
  ).toLowerCase();

  const etiqueta = $("nivelRisco");

  etiqueta.className = "risco";

  if (["baixo", "moderado", "alto"].includes(risco)) {
    etiqueta.classList.add(risco);
  }

  etiqueta.textContent = "Risco: " + risco;

  criarLista("listaRiscos", relatorio.riscos);

  criarLista(
    "listaSugestoes",
    relatorio.recomendacoes
  );

  escrever(
    "dataRelatorio",
    "Gerado em: " +
    new Date().toLocaleString("pt-BR")
  );

  $("resultadoRelatorio").hidden = false;
  $("botaoImprimir").disabled = false;
}

// ====================================
// SOLICITAR ANALISE AO GEMINI
// ====================================

async function gerarRelatorio() {
  const botao = $("botaoGerar");

  botao.disabled = true;

  $("resultadoRelatorio").hidden = true;
  $("botaoImprimir").disabled = true;

  escrever(
    "mensagemIA",
    "Analisando as medições com Gemini..."
  );

  try {
    const horas = Number($("periodo").value);

    const { data, error } =
      await db.functions.invoke(
        "analisar-dados",
        {
          body: {
            periodo_horas: horas
          }
        }
      );

    if (error) {
      let detalhe = "";

      try {
        const corpoErro =
          await error.context?.json();

        detalhe = corpoErro?.erro || "";
      } catch {
        // Resposta sem JSON.
      }

      throw new Error(
        detalhe || error.message
      );
    }

    mostrarRelatorio(data);

    escrever(
      "mensagemIA",
      "Relatório gerado com sucesso!"
    );

  } catch (erro) {
    console.error(
      "Erro ao gerar relatório:",
      erro
    );

    escrever(
      "mensagemIA",
      "Não foi possível gerar o relatório: " +
      erro.message
    );

  } finally {
    botao.disabled = false;
  }
}

// ====================================
// BOTOES
// ====================================

$("botaoGerar").addEventListener(
  "click",
  gerarRelatorio
);

$("atualizarSensores").addEventListener(
  "click",
  carregarSensores
);

$("botaoImprimir").addEventListener(
  "click",
  () => window.print()
);

$("sair").addEventListener(
  "click",
  async () => {
    await db.auth.signOut();
    window.location.href = "login.html";
  }
);

// ====================================
// INICIAR
// ====================================

async function iniciar() {
  const { data, error } =
    await db.auth.getUser();

  if (error || !data?.user) {
    window.location.replace("login.html");
    return;
  }

  await carregarSensores();

  setInterval(
    carregarSensores,
    30000
  );
}

iniciar();
