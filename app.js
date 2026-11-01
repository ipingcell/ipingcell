// Website IPING CELL mandiri, tanpa Supabase. Data tersimpan di browser ini.
const KEY="ipingcell_catalog_v1", PINKEY="ipingcell_admin_pin_v1", WA="6285875177710";
const operators=[["telkomsel","TELKOMSEL","#e53935"],["indosat","IM3","#f4c20d"],["xl","XL","#1688ef"],["axis","AXIS","#7c3aed"],["tri","TRI (3)","#536b86"],["smartfren","SMARTFREN","#e83e8c"],["byu","BY.U","#3b82f6"]];
const seed=[["indosat","5GB",10000,"1 HARI","Paket Data"],["indosat","8GB",13000,"2 HARI","Paket Data"],["indosat","9GB",15000,"2 HARI","Paket Data"],["indosat","4GB",15000,"3 HARI","Paket Data"],["axis","6GB",10000,"1 HARI","AIGO"],["axis","5GB",18000,"5 HARI","AIGO"],["tri","10GB",10000,"1 HARI","Happy"],["xl","7GB",38000,"28 HARI","FlexMax"],["telkomsel","Paket Internet",10000,"1 HARI","Internet"]].map((x,i)=>({id:i+1,provider_id:x[0],name:x[1],price:x[2],duration:x[3],tag:x[4],active:true}));
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])), money=n=>"Rp"+Number(n||0).toLocaleString("id-ID");
let packages=read(), provider="indosat", duration="", unlocked=false;
function read(){try{let d=JSON.parse(localStorage.getItem(KEY));if(Array.isArray(d))return d}catch(e){}localStorage.setItem(KEY,JSON.stringify(seed));return seed.map(x=>({...x}))}
function save(){localStorage.setItem(KEY,JSON.stringify(packages))}
function toast(t){let e=$("#toast");e.textContent=t;e.hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.hidden=true,2500)}
function render(){
  let live=packages.filter(p=>p.active!==false);
  let order=["1 HARI","2 HARI","3 HARI","5 HARI","7 HARI","14 HARI","28 HARI"];

  $("#providers").innerHTML=operators.map(o=>
    `<button class="pill ${provider===o[0]?"active":""}" data-provider="${o[0]}"><span style="color:${o[2]}">●</span> ${o[1]}</button>`
  ).join("");

  let ds=[...new Set(live.filter(p=>p.provider_id===provider).map(p=>p.duration))]
    .sort((a,b)=>{
      let ia=order.indexOf(a), ib=order.indexOf(b);
      return (ia<0?999:ia)-(ib<0?999:ib);
    });

  if(!ds.includes(duration)) duration=ds[0]||"";

  $("#durations").innerHTML=ds.map(d=>
    `<button class="pill ${duration===d?"active":""}" data-duration="${esc(d)}">${esc(d)}</button>`
  ).join("");

  let list=live
    .filter(p=>p.provider_id===provider&&p.duration===duration)
    .sort((a,b)=>a.name.localeCompare(b.name,"id",{numeric:true,sensitivity:"base"}));

  $("#packages").innerHTML=list.map(p=>
    `<button class="pkg" data-pkg="${p.id}"><strong>${esc(p.name)}</strong><div class="price">${money(p.price)}</div><span class="tag">${esc(p.tag||"Paket Data")}</span><div class="foot">◷ ${esc(p.duration)} · Lihat detail</div></button>`
  ).join("")||'<p class="muted">Belum ada paket untuk pilihan ini.</p>';

  $("#count").textContent=list.length+" paket";
}function detail(id){let p=packages.find(x=>String(x.id)===String(id));if(!p)return;let name=operators.find(o=>o[0]===p.provider_id)?.[1]||p.provider_id,msg=encodeURIComponent(`Halo IPING CELL, saya ingin membeli ${name} ${p.name}, masa aktif ${p.duration}, harga ${money(p.price)}.`);$("#detail").innerHTML=`<small>${esc(name)}</small><h2>${esc(p.name)}</h2><div class="price">${money(p.price)}</div><p class="muted">Masa aktif: ${esc(p.duration)}<br>Keterangan: ${esc(p.tag||"Paket Data")}</p><a class="primary" target="_blank" href="https://wa.me/${WA}?text=${msg}">Pesan via WhatsApp</a>`;$("#modal").hidden=false}
function adminUI(){$("#admin").innerHTML=`<h2>Admin IPING CELL</h2><p class="muted">Data tersimpan hanya di browser/perangkat ini.</p><div id="login"><form id="pinForm"><label class="field">PIN Admin (awal 1234)<input id="pin" type="password" required></label><button class="primary">Masuk</button></form></div><div id="panel" hidden><div class="tools"><button id="add">+ Tambah Paket</button><button id="backup">Cadangkan Data</button><label class="pill">Pulihkan Data <input id="restore" type="file" accept="application/json" hidden></label><button id="pinChange">Ubah PIN</button></div><div class="filters"><select id="opFilter"><option value="all">Semua operator</option>${operators.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("")}</select><input id="search" placeholder="Cari paket..."></div><div id="rows"></div><p class="note">Sebelum ganti perangkat atau membersihkan data browser, unduh cadangan. Perubahan di browser ini tidak otomatis tampil di HP/pelanggan lain. Untuk mengubah katalog online, edit data di app.js lalu unggah ke GitHub Pages.</p></div>`;$("#pinForm").onsubmit=e=>{e.preventDefault();if($("#pin").value!==(localStorage.getItem(PINKEY)||"1234"))return toast("PIN salah");unlocked=true;$("#login").hidden=true;$("#panel").hidden=false;drawRows()};$("#add").onclick=()=>{packages.unshift({id:Date.now(),provider_id:provider,name:"",price:0,duration:duration||"1 HARI",tag:"Paket Data",active:true});save();drawRows()};$("#opFilter").onchange=drawRows;$("#search").oninput=drawRows;$("#backup").onclick=()=>{let a=document.createElement("a"),url=URL.createObjectURL(new Blob([JSON.stringify(packages,null,2)],{type:"application/json"}));a.href=url;a.download="cadangan-harga-iping-cell.json";a.click();URL.revokeObjectURL(url)};$("#restore").onchange=async e=>{try{let d=JSON.parse(await e.target.files[0].text());if(!Array.isArray(d))throw 0;packages=d;save();drawRows();render();toast("Cadangan dipulihkan")}catch(err){toast("File cadangan tidak valid")}};$("#pinChange").onclick=()=>{let p=prompt("PIN baru (minimal 4 karakter)");if(p&&p.length>=4){localStorage.setItem(PINKEY,p);toast("PIN diubah")}}}
function drawRows(){if(!unlocked)return;let f=$("#opFilter").value,q=$("#search").value.toLowerCase(),list=packages.filter(p=>(f==="all"||p.provider_id===f)&&(`${p.name} ${p.tag} ${p.duration}`).toLowerCase().includes(q));$("#rows").innerHTML=list.map(p=>`<div class="row" data-row="${p.id}"><label>Operator<select data-f="provider_id">${operators.map(o=>`<option value="${o[0]}" ${o[0]===p.provider_id?"selected":""}>${o[1]}</option>`).join("")}</select></label><label>Nama paket<input data-f="name" value="${esc(p.name)}"></label><label>Harga<input data-f="price" type="number" min="1" value="${p.price||""}"></label><label>Masa aktif<select data-f="duration">${["1 HARI","2 HARI","3 HARI","5 HARI","7 HARI","14 HARI","28 HARI"].map(d=>`<option ${d===p.duration?"selected":""}>${d}</option>`).join("")}</select></label><label>Keterangan<input data-f="tag" value="${esc(p.tag)}"></label><div><button data-save="${p.id}">Simpan</button> <button class="danger" data-del="${p.id}">Hapus</button></div></div>`).join("")||'<p class="muted">Paket tidak ditemukan.</p>';$("#rows").onclick=e=>{let s=e.target.closest("[data-save]");if(s){let r=s.closest(".row"),p=packages.find(x=>String(x.id)===s.dataset.save),n=r.querySelector('[data-f="name"]').value.trim(),v=Number(r.querySelector('[data-f="price"]').value);if(!n||v<=0)return toast("Isi nama dan harga dengan benar");p.provider_id=r.querySelector('[data-f="provider_id"]').value;p.name=n;p.price=v;p.duration=r.querySelector('[data-f="duration"]').value;p.tag=r.querySelector('[data-f="tag"]').value||"Paket Data";save();render();drawRows();toast("Paket tersimpan")}let d=e.target.closest("[data-del]");if(d&&confirm("Hapus paket ini?")){packages=packages.filter(x=>String(x.id)!==d.dataset.del);save();render();drawRows();toast("Paket dihapus")}}}
document.addEventListener("click",e=>{let c=e.target.closest("[data-close]");if(c){c.closest(".modal").hidden=true;return}if(e.target.classList.contains("modal"))e.target.hidden=true;let p=e.target.closest("[data-provider]");if(p){provider=p.dataset.provider;duration="";render()}let d=e.target.closest("[data-duration]");if(d){duration=d.dataset.duration;render()}let x=e.target.closest("[data-pkg]");if(x)detail(x.dataset.pkg)});$("#adminBtn").onclick=()=>{$("#adminModal").hidden=false;unlocked=false;adminUI()};$("#theme").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("ipingcell_theme",document.body.classList.contains("dark")?"dark":"light")};$("#contact").href="https://wa.me/"+WA+"?text="+encodeURIComponent("Halo IPING CELL, saya ingin bertanya.");$("#year").textContent=new Date().getFullYear();if(localStorage.getItem("ipingcell_theme")==="dark")document.body.classList.add("dark");render();
