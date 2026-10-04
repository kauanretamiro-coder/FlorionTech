const popup = document.getElementById("popup");
const popupregistro = document.getElementById("popupmanual");
const fecharpopup= document.getElementById("fecharpopup");

popup.addEventListener("click", () => {
  popupregistro.showModal();
});

fecharpopup.addEventListener("click", () => {
  popupregistro.close();
}); 