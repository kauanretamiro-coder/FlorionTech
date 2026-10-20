
// CONEXÃO COM O SUPABASE
const supabaseUrl = "https://gyqvgandakzakaywexav.supabase.co";
const supabaseKey = "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";

const db = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

// FORMULÁRIO
const form = document.getElementById("formLogin");
const mensagem = document.getElementById("mensagem");
const botao = document.getElementById("botaoLogin");

// QUANDO CLICAR EM ENTRAR
form.addEventListener("submit", async (evento) => {

  evento.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  botao.disabled = true;
  botao.textContent = "Entrando...";
  mensagem.textContent = "";

  try {
    // VERIFICA EMAIL E SENHA NO SUPABASE
    const { data, error } = await db.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      mensagem.textContent =
        "E-mail ou senha incorretos.";
      return;
    }

    // LOGIN CORRETO
    if (data.session) {
      window.location.href = "painel.html";
    }

  } catch (erro) {
    mensagem.textContent = "Erro ao conectar com o servidor.";
    console.error(erro);

  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }

});
