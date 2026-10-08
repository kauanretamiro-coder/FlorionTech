
const URL_SUPABASE = "https://gyqvgandakzakaywexav.supabase.co";
const CHAVE_SUPABASE = "sb_publishable_GNBCv1h5zhh3u_K7llXIJg_kOawfoWy";

const db = supabase.createClient(
  URL_SUPABASE,
  CHAVE_SUPABASE
);

const form = document.getElementById("formCadastro");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  mensagem.textContent = "Cadastrando...";

  const { error } = await db.auth.signUp({
    email: email,
    password: senha,
    options: {
      data: {
        nome: nome
      }
    }
  });

  if (error) {
    mensagem.textContent =
      "Erro no cadastro: " + error.message;
    return;
  }

  mensagem.textContent =
    "Cadastro recebido! Confira seu e-mail para confirmar a conta.";

  form.reset();
});
