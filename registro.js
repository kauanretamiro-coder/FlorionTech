const popup = document.getElementById("popup");
const popupregistro = document.getElementById("popupregistro");
const fecharpopup= document.getElementById("fecharpopup");

igor.addEventListener("click", () => {
  popup.showModal();
});

fecharpopup.addEventListener("click", () => {
  popup.close();
}); 