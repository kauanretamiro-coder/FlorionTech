const URL_SUPABASE = "https://gyqvgandakzakaywexav.supabase.co";
const CHAVE_PUBLICA = "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";
const db = supabase.createClient(URL_SUPABASE, CHAVE_PUBLICA);

const formulario = document.getElementById("filtros");
const inicioInput = document.getElementById("dataInicio");
const fimInput = document.getElementById("dataFim");
const categoriaInput = document.getElementById("categoria");
const mensagem = document.getElementById("mensagem");
const botao = formulario.querySelector('button[type="submit"]');
let grafico = null;

function dataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
function dataBR(iso) { return iso.split("-").reverse().join("/"); }
function preencherDatas() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - 30);
  inicioInput.value = dataLocal(inicio);
  fimInput.value = dataLocal(hoje);
}

async function verificarLogin() {
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) {
    window.location.replace("login.html");
    return false;
  }
  return true;
}

// Busca todas as páginas dentro do intervalo (não fica limitado aos primeiros 1000 registros).
async function buscarRegistros(dataInicio, dataFim, tipo) {
  const todos = [];
  const tamanhoPagina = 1000;
  for (let inicio = 0; ; inicio += tamanhoPagina) {
    const { data, error } = await db.from("registros")
      .select("id, data_registro, tipo, valor")
      .eq("tipo", tipo)
      .gte("data_registro", dataInicio)
      .lte("data_registro", dataFim)
      .order("data_registro", { ascending: true })
      .order("id", { ascending: true })
      .range(inicio, inicio + tamanhoPagina - 1);
    if (error) throw error;
    todos.push(...data);
    if (data.length < tamanhoPagina) break;
  }
  return todos;
}

function desenharGrafico(registros, tipo) {
  const porDia = new Map();
  for (const registro of registros) {
    const valor = Number(registro.valor);
    if (!Number.isFinite(valor)) continue;
    const dia = registro.data_registro;
    const acumulado = porDia.get(dia) || { soma: 0, quantidade: 0 };
    acumulado.soma += valor;
    acumulado.quantidade++;
    porDia.set(dia, acumulado);
  }
  const dias = [...porDia.keys()].sort();
  const valores = dias.map(dia => {
    const item = porDia.get(dia);
    return Number((item.soma / item.quantidade).toFixed(3));
  });
  const nomes = { temperatura: "Temperatura (°C)", ph: "pH", fosforo: "Fósforo" };
  if (grafico) grafico.destroy();
  grafico = new Chart(document.getElementById("grafico"), {
    type: "line",
    data: {
      labels: dias.map(dataBR),
      datasets: [{
        label: nomes[tipo] || tipo,
        data: valores,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,.12)",
        pointRadius: 5,
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "Data" } },
        y: { title: { display: true, text: nomes[tipo] || "Valor" } }
      }
    }
  });
  return dias.length;
}

async function atualizarGrafico(evento) {
  if (evento) evento.preventDefault();
  const inicio = inicioInput.value;
  const fim = fimInput.value;
  const tipo = categoriaInput.value;
  if (!inicio || !fim || inicio > fim) {
    mensagem.textContent = "Selecione datas válidas: a data inicial deve ser anterior ou igual à final.";
    return;
  }
  botao.disabled = true;
  mensagem.textContent = "Buscando medições...";
  try {
    const registros = await buscarRegistros(inicio, fim, tipo);
    const dias = desenharGrafico(registros, tipo);
    mensagem.textContent = dias
      ? `${registros.length} medição(ões) em ${dias} dia(s) com dados.`
      : "Nenhum registro encontrado nesse intervalo e categoria.";
  } catch (erro) {
    console.error(erro);
    mensagem.textContent = "Erro ao buscar dados: " + erro.message;
  } finally {
    botao.disabled = false;
  }
}

formulario.addEventListener("submit", atualizarGrafico);
document.getElementById("sair").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) { mensagem.textContent = "Erro ao sair: " + error.message; return; }
  window.location.replace("login.html");
});

async function iniciar() {
  if (!(await verificarLogin())) return;
  preencherDatas();
  await atualizarGrafico();
}
iniciar();
