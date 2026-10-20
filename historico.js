
const URL_SUPABASE = "https://gyqvgandakzakaywexav.supabase.co";

const CHAVE_PUBLICA = "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";

const db = supabase.createClient(
  URL_SUPABASE,
  CHAVE_PUBLICA
);

const corpoTabela = document.getElementById("corpoTabela");
const mensagem = document.getElementById("mensagem");
const filtroTipo = document.getElementById("filtroTipo");
const filtroData = document.getElementById("filtroData");

let registros = [];

// Verificar autenticação
async function verificarLogin() {
  const { data, error } = await db.auth.getUser();

  if (error || !data.user) {
    window.location.replace("login.html");
    return false;
  }

  return true;
}

// Buscar dados no Supabase
async function carregarHistorico() {
  mensagem.textContent = "Carregando registros...";

  const { data, error } = await db
    .from("registros")
    .select(
      "id, data_registro, tipo, valor, nome_usuario, criado_em"
    )
    .order("data_registro", { ascending: false })
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);

  if (error) {
    console.error(error);
    mensagem.textContent =
      "Erro ao carregar histórico: " + error.message;
    return;
  }

  registros = data || [];
  mostrarRegistros();
}

// Mostrar registros e aplicar filtros
function mostrarRegistros() {
  const tipoSelecionado = filtroTipo.value;
  const dataSelecionada = filtroData.value;

  const filtrados = registros.filter(registro => {
    const correspondeTipo =
      !tipoSelecionado ||
      registro.tipo === tipoSelecionado;

    const correspondeData =
      !dataSelecionada ||
      registro.data_registro === dataSelecionada;

    return correspondeTipo && correspondeData;
  });

  corpoTabela.replaceChildren();

  if (filtrados.length === 0) {
    mensagem.textContent = "Nenhum registro encontrado.";
    return;
  }

  mensagem.textContent =
    `${filtrados.length} registro(s) encontrado(s).`;

  for (const registro of filtrados) {
    const linha = document.createElement("tr");

    const data = document.createElement("td");
    data.textContent = registro.data_registro
      ? registro.data_registro.split("-").reverse().join("/")
      : "-";

    const tipo = document.createElement("td");

    const nomes = {
      temperatura: "Temperatura",
      ph: "pH",
      fosforo: "Fósforo"
    };

    tipo.textContent =
      nomes[registro.tipo] || registro.tipo;

    const valor = document.createElement("td");
    const unidade = registro.tipo === "temperatura"
      ? " °C"
      : "";

    valor.textContent = `${registro.valor}${unidade}`;

    const usuario = document.createElement("td");
    usuario.textContent =
      registro.nome_usuario || "Não informado";

    linha.append(data, tipo, valor, usuario);
    corpoTabela.appendChild(linha);
  }
}

// Filtros
filtroTipo.addEventListener("change", mostrarRegistros);
filtroData.addEventListener("change", mostrarRegistros);

// Limpar filtros
document.getElementById("limparFiltros")
  .addEventListener("click", () => {
    filtroTipo.value = "";
    filtroData.value = "";
    mostrarRegistros();
  });

// Atualizar histórico
document.getElementById("atualizar")
  .addEventListener("click", carregarHistorico);

// Iniciar
async function iniciar() {
  const logado = await verificarLogin();

  if (logado) {
    await carregarHistorico();
  }
}

iniciar();
