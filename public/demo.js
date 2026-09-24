let selected={name:"WiFi 1 Hari",price:5000};
let invoice="WIFI-DEMO-001";

const money=n=>"Rp "+Number(n).toLocaleString("id-ID");

function scrollToPlans(){
  goSection("paket");
}

function selectPlan(el){
  document.querySelectorAll(".plan").forEach(x=>x.classList.remove("selected"));
  el.classList.add("selected");
  selected={name:el.dataset.plan,price:Number(el.dataset.price)};
  document.getElementById("summaryPlan").textContent=selected.name;
  document.getElementById("summaryPrice").textContent=money(selected.price);
  openCheckout();
}

function openCheckout(){
  document.getElementById("summaryPlan").textContent=selected.name;
  document.getElementById("summaryPrice").textContent=money(selected.price);
  document.getElementById("checkoutModal").classList.add("show");
}

function startPayment(){
  const name=document.getElementById("customerName").value.trim();
  if(!name){
    document.getElementById("customerName").focus();
    return;
  }
  invoice="WIFI-"+Date.now().toString(36).toUpperCase();
  document.getElementById("invoiceNo").textContent=invoice;
  document.getElementById("invoicePlan").textContent=selected.name;
  document.getElementById("invoiceTotal").textContent=money(selected.price);
  document.getElementById("payPrice").textContent=money(selected.price);
  document.getElementById("checkoutModal").classList.remove("show");
  document.getElementById("paymentModal").classList.add("show");
}

function simulatePaid(){
  document.getElementById("paymentModal").classList.remove("show");
  const user="WIFI"+Math.random().toString(36).slice(2,8).toUpperCase();
  const pass=Math.random().toString(36).slice(2,10);
  const d=new Date(Date.now()+24*60*60*1000);
  document.getElementById("demoUser").textContent=user;
  document.getElementById("demoPass").textContent=pass;
  document.getElementById("demoExpiry").textContent=d.toLocaleString("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  document.getElementById("successModal").classList.add("show");
}

function openStatus(){
  goSection("status");
}

function closeModal(){document.getElementById("checkoutModal").classList.remove("show")}
function closePayment(){document.getElementById("paymentModal").classList.remove("show")}
function backToCheckout(){
  document.getElementById("paymentModal").classList.remove("show");
  document.getElementById("checkoutModal").classList.add("show");
}
function closeSuccess(){document.getElementById("successModal").classList.remove("show")}

async function copyText(id){
  try{await navigator.clipboard.writeText(document.getElementById(id).textContent)}catch(e){}
}

document.querySelectorAll(".plan").forEach(el=>{
  el.addEventListener("mouseenter",()=>el.classList.add("hovered"));
});

document.querySelectorAll(".modal").forEach(m=>{
  m.addEventListener("click",e=>{
    if(e.target===m)m.classList.remove("show");
  });
});

function goSection(id){
  const el=document.getElementById(id);
  if(!el)return;
  const header=document.querySelector(".nav");
  const offset=(header?header.offsetHeight:78)+8;
  const y=el.getBoundingClientRect().top+window.pageYOffset-offset;
  window.scrollTo({top:y,behavior:"smooth"});
  document.body.classList.remove("menu-open");
  setActiveNav(id);
}

function setActiveNav(id){
  document.querySelectorAll(".nav nav a").forEach(a=>{
    a.classList.toggle("active",(a.getAttribute("href")||"")==="#"+id);
  });
}

document.querySelectorAll(".nav nav a").forEach(a=>{
  a.addEventListener("click",function(e){
    const id=(this.getAttribute("href")||"").replace("#","");
    if(document.getElementById(id)){
      e.preventDefault();
      this.classList.add("nav-pressed");
      setTimeout(()=>this.classList.remove("nav-pressed"),180);
      goSection(id);
    }
  });
});

const navSections=["beranda","paket","cara","status"]
  .map(id=>document.getElementById(id))
  .filter(Boolean);

let ticking=false;
window.addEventListener("scroll",()=>{
  if(ticking)return;
  ticking=true;
  requestAnimationFrame(()=>{
    const header=document.querySelector(".nav");
    const marker=(header?header.offsetHeight:78)+80;
    let current="beranda";
    for(const section of navSections){
      if(section.getBoundingClientRect().top<=marker) current=section.id;
    }
    setActiveNav(current);
    ticking=false;
  });
});

window.addEventListener("load",()=>{
  setActiveNav("beranda");
});
