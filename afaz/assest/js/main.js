const barLineOpen = document.querySelector(".menu-bar");
const barLineClose = document.querySelector(".btn-close-bar");
barLineOpen.addEventListener("click", openBarMenu);
barLineClose.addEventListener("click", openBarMenu);

const container = document.querySelector(".main-bottom-card-container");

// مسیر نسبی به api.php (در همان پوشه‌ای که index.html هست)
const apiFeatured = fetch('http://ghulbazar.nadcoteam.ir/api.php?endpoint=products')
  .then(res => res.json());

function openBarMenu() {
  let x = document.querySelector(".menu-bar-items");
  x.style.right == "-1px" ? (x.style.right = "-13rem") : (x.style.right = "-1px");
}

let i = 0;
let cardList = [];

apiFeatured.then(info => {
  info.data.forEach(object => {
    if (object.featured === 1) {
      const name = object.name;
      const price = object.price;
      const image = object.image;
      loadCard(name, price, image);
    }
  });

  cardList = document.querySelectorAll(".main-bottom-cards-card");
  if (cardList.length > 0) {
    updateCard(i, cardList);

    setInterval(() => {
      i = (i + 1) % cardList.length;
      updateCard(i, cardList);
    }, 3000);
  }
});

function loadCard(name, price, image) {
  let newCard = document.createElement("div");
  newCard.classList.add("main-bottom-cards-card");
  newCard.innerHTML = `
    <img src="${image}" class="main-bottom-cards-card__img" alt="عکس">
    <div class="main-bottom-cards-card-info">
      <h3 class="cards-card-info__name">${name}</h3>
      <p class="cards-card-info__date">${price}</p>
    </div>
  `;
  container.appendChild(newCard);
}

function updateCard(myInt, cards) {
  cards.forEach((item, index) => {
    item.className = "main-bottom-cards-card";
    if (index === myInt) {
      item.classList.add("active");
    } else if (index === (myInt - 1 + cards.length) % cards.length) {
      item.classList.add("ghabl");
    } else if (index === (myInt + 1 + cards.length) % cards.length) {
      item.classList.add("bad");
    }
  });
}