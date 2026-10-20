const kauan = document.getElementById("kauan"); //oq vai ser clicado
const popupkauan = document.getElementById("popupkauan"); //oq vai ser mostrado
const fecharkauan = document.getElementById("fecharkauan"); //quem vai fechar

kauan.addEventListener("click", () => {
  popupkauan.showModal();
});

fecharkauan.addEventListener("click", () => {
  popupkauan.close();
});

const igor = document.getElementById("igor");
const popupigor = document.getElementById("popupigor");
const fecharigor= document.getElementById("fecharigor");

igor.addEventListener("click", () => {
  popupigor.showModal();
});

fecharigor.addEventListener("click", () => {
  popupigor.close();
});

const samilly = document.getElementById("samilly");
const popupsamilly = document.getElementById("popupsamilly");
const fecharsamilly= document.getElementById("fecharsamilly");

samilly.addEventListener("click", () => {
  popupsamilly.showModal();
});

fecharsamilly.addEventListener("click", () => {
  popupsamilly.close();
});

const guilherme = document.getElementById("guilherme");
const popupguilherme = document.getElementById("popupguilherme");
const fecharguilherme= document.getElementById("fecharguilherme");

guilherme.addEventListener("click", () => {
  popupguilherme.showModal();
});

fecharguilherme.addEventListener("click", () => {
  popupguilherme.close();
});

const heliton = document.getElementById("heliton");
const popupheliton = document.getElementById("popupheliton");
const fecharheliton= document.getElementById("fecharheliton");

heliton.addEventListener("click", () => {
  popupheliton.showModal();
});

fecharheliton.addEventListener("click", () => {
  popupheliton.close();
});
