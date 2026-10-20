// Cole aqui a URL e a chave pública (publishable) do seu projeto.
// NUNCA use a service_role ou uma chave secreta no navegador.
const URL_SUPABASE = "https://gyqvgandakzakaywexav.supabase.co";
const CHAVE_PUBLICA = "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";
const db = supabase.createClient(URL_SUPABASE, CHAVE_PUBLICA);

const popup = document.getElementById("popupmanual");
const abrirPopup = document.getElementById("abrirPopup");
const fecharPopup = document.getElementById("fecharpopup");
const formulario = document.getElementById("formDados");
const mensagemFormulario = document.getElementById("mensagemFormulario");
const mensagemPainel = document.getElementById("mensagemPainel");
const painel = document.getElementById("painelRegistros");
const botaoSalvar = document.getElementById("botaoSalvar");
const dataInput = document.getElementById("data");
const tipoInput = document.getElementById("tipo");
const valorInput = document.getElementById("valor");
const labelValor = document.getElementById("labelValor");

const unidades = { temperatura: "°C", ph: "", fosforo: "" };

function preencherDataAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  dataInput.value = `${ano}-${mes}-${dia}`;
}

function atualizarLabel() {
  const unidade = unidades[tipoInput.value] || "";
  labelValor.textContent = unidade ? `Valor (${unidade})` : "Valor";
}

abrirPopup.addEventListener("click", () => {
  mensagemFormulario.textContent = "";
  popup.showModal();
});
fecharPopup.addEventListener("click", () => popup.close());
tipoInput.addEventListener("change", atualizarLabel);
preencherDataAtual();

async function usuarioLogado() {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) {
    window.location.replace("login.html");
    return false;
  }
  return true;
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dataRegistro = dataInput.value;
  const tipo = tipoInput.value;
  const valorTexto = valorInput.value;
  const valor = Number(valorTexto);

  if (!dataRegistro || !Object.hasOwn(unidades, tipo) ||
      valorTexto.trim() === "" || !Number.isFinite(valor)) {
    mensagemFormulario.textContent = "Preencha os campos corretamente.";
    return;
  }

  botaoSalvar.disabled = true;
  mensagemFormulario.textContent = "Salvando...";

  try {
    const { data: auth, error: erroAuth } = await db.auth.getUser();
    if (erroAuth || !auth.user) {
      window.location.replace("login.html");
      return;
    }

    const { error } = await db.from("registros").insert({
      data_registro: dataRegistro,
      tipo,
      valor
    });

    if (error) throw error;

    formulario.reset();
    preencherDataAtual();
    atualizarLabel();
    await carregarRegistros();
    popup.close();
  } catch (erro) {
    console.error("Erro ao salvar:", erro);
    mensagemFormulario.textContent = `Erro ao salvar: ${erro.message || "Falha de conexão"}`;
  } finally {
    botaoSalvar.disabled = false;
  }
});

async function carregarRegistros() {
  mensagemPainel.textContent = "Carregando registros...";

  const { data, error } = await db.from("registros")
    .select("id, tipo, valor, data_registro, criado_em, nome_usuario")
    .order("data_registro", { ascending: false })
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao carregar:", error);
    mensagemPainel.textContent = `Erro ao carregar: ${error.message}`;
    return;
  }

  const ultimos = new Map();
  for (const registro of data || []) {
    if (!ultimos.has(registro.tipo)) ultimos.set(registro.tipo, registro);
  }

  painel.replaceChildren();
  if (ultimos.size === 0) {
    mensagemPainel.textContent = "Nenhum registro encontrado.";
    return;
  }

  mensagemPainel.textContent = "Últimos registros por categoria:";
  for (const registro of ultimos.values()) {
    const card = document.createElement("article");
    card.className = "card";
    const titulo = document.createElement("h3");
    titulo.textContent = registro.tipo.toUpperCase();
    const valorElemento = document.createElement("div");
    valorElemento.className = "valor";
    valorElemento.textContent = `${registro.valor} ${unidades[registro.tipo] || ""}`.trim();
    const detalhes = document.createElement("div");
    detalhes.className = "detalhes";
    const dataFormatada = registro.data_registro
      ? registro.data_registro.split("-").reverse().join("/") : "Sem data";
    detalhes.textContent = `Data: ${dataFormatada} | Cadastrado por: ${registro.nome_usuario || "Não informado"}`;
    card.append(titulo, valorElemento, detalhes);
    painel.appendChild(card);
  }
}

document.getElementById("atualizar").addEventListener("click", carregarRegistros);
document.getElementById("sair").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) {
    mensagemPainel.textContent = `Erro ao sair: ${error.message}`;
    return;
  }
  window.location.replace("login.html");
});

async function iniciar() {
  if (!(await usuarioLogado())) return;

  await carregarRegistros();
  await carregarUmidadeSolo();
  await carregarLuminosidade();

  setInterval(carregarRegistros, 30000);
  setInterval(carregarUmidadeSolo, 10000);
  setInterval(carregarLuminosidade, 3000);
}

iniciar();


async function carregarUmidadeSolo() {
  const { data, error } = await db
    .from("leituras_solo")
    .select("umidade_percentual, criado_em")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar umidade:", error);
    return;
  }

  const elemento = document.getElementById("umidadeSolo");

  if (!elemento) return;

  elemento.textContent = data
    ? `${data.umidade_percentual.toFixed(1)}%`
    : "Sem medições";
}

async function carregarLuminosidade() {
  const valorElemento =
    document.getElementById("valorLuminosidade");

  const statusElemento =
    document.getElementById("statusLuminosidade");

  const horarioElemento =
    document.getElementById("horarioLuminosidade");

if (!valorElemento || !statusElemento || !horarioElemento) {
  console.error("Elementos da luminosidade não encontrados no HTML");
  return;
}

  const { data, error } = await db
    .from("leituras_luminosidade")
    .select("valor_bruto, criado_em")
    .eq("dispositivo", "esp32-florion-01")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar luminosidade:", error);

    valorElemento.textContent = "--";
    statusElemento.textContent = "Erro ao carregar dados";
    return;
  }

  if (!data) {
    valorElemento.textContent = "--";
    statusElemento.textContent = "Sem leituras";
    horarioElemento.textContent =
      "Aguardando dados do ESP32";
    return;
  }

  const luminosidade = data.valor_bruto;

  valorElemento.textContent = luminosidade;

  statusElemento.textContent =
    "Sensor de luminosidade conectado";

  horarioElemento.textContent =
    "Última leitura: " +
    new Date(data.criado_em).toLocaleString("pt-BR");
}