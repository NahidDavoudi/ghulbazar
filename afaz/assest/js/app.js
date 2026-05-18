const barLineOpen = document.querySelector(".menu-bar");
const barLineClose = document.querySelector(".btn-close-bar");
barLineOpen.addEventListener("click", openBarMenu);
barLineClose.addEventListener("click",openBarMenu);
const container = document.querySelector(".main-bottom-card-container");
const apiFeatured = fetch('http://ghulbazar.nadcoteam.ir/api.php?endpoint=products').then(res => res.json());

function openBarMenu(){
    let x = document.querySelector(".menu-bar-items");
    x.style.right == "-1px" ? x.style.right = "-13rem" : x.style.right = "-1px";
}

let i = 0;


// container.addEventListener("",function (){
//     if(i === (card.length -1)){
//         i = 0;
//     }else{i++;}
//     updateCard(i);
// })


apiFeatured.then(info => {
    info.data.forEach(object =>{
        if(object.featured === 1){
            const name = object.name;
            const price = object.price;
            const image = object.image;
            loadCard(name,price,image);

        }
    })
    const card = document.querySelectorAll(".main-bottom-cards-card");
    console.log(card.length,card.innerHTML)
    updateCard(i,card);
    
});


function loadCard (name,price,image){
        let newCard = document.createElement("div");
        newCard.classList.add("main-bottom-cards-card");
        newCard.innerHTML = `    
        <div class="main-bottom-cards-card">
        <img src='${image}' class="main-bottom-cards-card__img" alt="عکس">
        <div class="main-bottom-cards-card-info">
        <h3 class="cards-card-info__name">${name}</h3>
              <p class="cards-card-info__date">${price}</p>
              </div>
        </div>`;
    
        container.appendChild(newCard);
}
    
setInterval(() => {
    if(i === (card.length -1)){
        i = 0;
    }else{i++;}
}, 3000);
    

function updateCard(myInt,card) {

    console.log(card);

    card.forEach((item, index) => {
        item.className = "main-bottom-cards-card";
        if (index === myInt) {
            item.classList.add("active");
        } else if (index === (myInt - 1 + card.length) % card.length){
            item.classList.add("ghabl");
        } else if (index === (myInt + 1 + card.length) % card.length){
            item.classList.add("bad");
        }
    })
}


