const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
let providers=[], packages=[], selectedProvider="axis", selectedDuration="5 HARI", adminUser=null;

const $=s=>document.querySelector(s);
const money=n=>"Rp "+Number(n||0).toLocaleString("id-ID");
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

async function loadData(){
  const p=await sb.from("providers").select("*").order("sort_order");
  const k=await sb.from("packages").select("*").eq("active",true).order("sort_order");
  if(p.error) return showToast("Gagal membaca provider: "+p.error.message);
  if(k.error) return showToast("Gagal membaca paket: "+k.error.message);
  providers=p.data||[]; packages=k.data||[];
  if(!providers.some(x=>x.id===selectedProvider)) selectedProvider=providers[0]?.id;
  render();
}
function render(){
  const pl=$("#providerList"); pl.innerHTML=providers.map(p=>`<button class="provider ${p.id===selectedProvider?"active":""}" data-provider="${esc(p.id)}"><span class="dot" style="background:${esc(p.color||"#22d3ee")}"></span>${esc(p.name)}</button>`).join("");
  const order=["1 HARI","2 HARI","3 HARI","5 HARI","7 HARI","14 HARI","28 HARI"];
  const ds=[...new Set(packages.filter(x=>x.provider_id===selectedProvider).map(x=>x.duration))]
  .sort((a,b)=>(order.indexOf(a)-order.indexOf(b)));
  if(!ds.includes(selectedDuration)) selectedDuration=ds[0]||"";
  $("#durationList").innerHTML=ds.map(d=>`<button class="duration ${d===selectedDuration?"active":""}" data-duration="${esc(d)}">${esc(d)}</button>`).join("");
  const p=providers.find(x=>x.id===selectedProvider);
  $("#heroKicker").textContent=p?.promo_kicker||"PROMO IPING CELL";
  $("#heroTitle").textContent=p?.promo_title||`${p?.name||"Paket"} Hemat`;
  $("#heroText").textContent=p?.promo_price||"Pilih paket sesuai kebutuhan Anda.";
  const list=packages
  .filter(x=>x.provider_id===selectedProvider && x.duration===selectedDuration)
  .sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  $("#packageGrid").innerHTML=list.map(x=>`<article class="package" data-package="${x.id}"><div class="pkg-name">${esc(x.name)}</div><div class="pkg-price">${money(x.price)}</div><span class="pkg-tag">${esc(x.tag||"Internet")}</span><div class="pkg-foot">⏱ ${esc(x.duration)} • Klik untuk detail</div></article>`).join("");
  $("#emptyState").hidden=list.length>0;
}
document.addEventListener("click",async e=>{
  const close=e.target.closest("[data-close]");
  if(close){
    const modal=close.closest(".modal");
    if(modal) modal.hidden=true;
    return;
  }
  if(e.target.classList.contains("modal")){
    e.target.hidden=true;
    return;
  }
  const p=e.target.closest("[data-provider]"); if(p){selectedProvider=p.dataset.provider;render();return}
  const d=e.target.closest("[data-duration]"); if(d){selectedDuration=d.dataset.duration;render();return}
  const card=e.target.closest("[data-package]"); if(card){openDetail(Number(card.dataset.package));return}
});
function openDetail(id){
  const x=packages.find(v=>v.id===id); if(!x)return;
  const phone="6285875177710";
  const msg=encodeURIComponent(`Halo IPING CELL, saya ingin membeli ${x.name} - ${money(x.price)} (${x.duration}).`);
  const wa=phone?`https://wa.me/${phone.replace(/\D/g,"")}?text=${msg}`:"#";
  $("#detailContent").innerHTML=`<h2>${esc(x.name)}</h2><p class="pkg-price">${money(x.price)}</p><p class="muted">Provider: ${esc(providers.find(p=>p.id===x.provider_id)?.name||"")}<br>Masa aktif: ${esc(x.duration)}<br>Keterangan: ${esc(x.tag||"Internet")}</p><a class="primary-btn" style="display:inline-block;text-decoration:none" href="${wa}" target="_blank" rel="noopener">PESAN VIA WHATSAPP</a>`;
  $("#detailModal").hidden=false;
}
$("#refreshBtn").addEventListener("click",async()=>{
  await loadData();
  showToast("Data berhasil diperbarui");
});
$("#themeBtn").onclick=()=>document.body.classList.toggle("light");
$("#adminBtn").onclick=()=>{ $("#adminModal").hidden=false; if(adminUser) renderAdmin(); };
$("#loginForm").onsubmit=async e=>{e.preventDefault();const {data,error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value,password:$("#loginPassword").value});if(error){$("#loginMsg").textContent=error.message;return}adminUser=data.user;renderAdmin()};

async function renderAdmin(){
  const {data,error}=await sb.from("packages").select("*").order("provider_id").order("sort_order");
  if(error){
    showToast(error.message);
    return;
  }

  packages=data||packages;

  $("#adminContent").innerHTML=`
    <h2>Admin IPING CELL</h2>

    <div class="admin-toolbar">
      <button id="addPkg" class="primary-btn">+ Tambah Paket</button>
      <button id="logout" class="outline-btn">Logout</button>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:15px 0">
      <select id="adminProvider" class="admin-filter">
        ${providers.map(p=>`
          <option value="${esc(p.id)}" ${p.id===selectedProvider?"selected":""}>
            ${esc(p.name)}
          </option>
        `).join("")}
      </select>

      <input
        id="adminSearch"
        class="admin-filter"
        placeholder="🔍 Cari paket..."
      >
    </div>

    <div id="adminRows"></div>
    <div id="adminMsg" class="msg"></div>
  `;

  drawAdminRows();

  $("#adminProvider").onchange=()=>{
    selectedProvider=$("#adminProvider").value;
    drawAdminRows();
  };

  $("#adminSearch").oninput=()=>{
    drawAdminRows();
  };

  $("#addPkg").onclick=()=>{
    drawAdminRows(true);
  };
}
function drawAdminRows(add=false){

    const rows=$("#adminRows");

    const provider=$("#adminProvider")?.value || selectedProvider;

    const search=($("#adminSearch")?.value || "")
        .toLowerCase()
        .trim();

    let data=packages.filter(x=>x.provider_id===provider);

    if(search){
        data=data.filter(x=>
            String(x.name||"")
                .toLowerCase()
                .includes(search)
        );
    }

    if(add){
        data.unshift({
            id:null,
            provider_id:provider,
            duration:selectedDuration || "5 HARI",
            name:"",
            price:0,
            tag:"Internet",
            active:true
        });
    }

    if(!data.length){
        rows.innerHTML=`
            <div style="padding:25px;text-align:center;opacity:.7">
                Tidak ada paket.
            </div>
        `;
        return;
    }

    rows.innerHTML=data.map(x=>{

        const isNew=x.id==null;

        const durations=[
            "1 HARI",
            "2 HARI",
            "3 HARI",
            "5 HARI",
            "7 HARI",
            "14 HARI",
            "28 HARI"
        ];

        return `
        <div class="admin-row"
             data-admin-row="${isNew ? "new" : x.id}">

            <label>
                Nama Paket

                <input
                    data-f="name"
                    value="${esc(x.name)}"
                >
            </label>

            <label>
                Harga

                <input
                    data-f="price"
                    type="number"
                    value="${Number(x.price||0)}"
                >
            </label>

            <label>
                Masa Aktif

                <select data-f="duration">
                    ${durations.map(d=>`
                        <option
                            value="${d}"
                            ${d===x.duration ? "selected" : ""}
                        >
                            ${d}
                        </option>
                    `).join("")}
                </select>
            </label>

            <div style="display:flex;gap:8px;align-items:end">

                <button
                    class="primary-btn"
                    data-save="${isNew ? "new" : x.id}"
                >
                    💾 Simpan
                </button>

                <button
                    class="danger-btn"
                    data-del="${isNew ? "new" : x.id}"
                >
                    🗑️ Hapus
                </button>

            </div>

        </div>
        `;

    }).join("");
}


$("#adminRows").onclick=async e=>{

    const save=e.target.closest("[data-save]");

    if(save){

        const row=save.closest(".admin-row");

        const name=row.querySelector('[data-f="name"]').value.trim();

        const price=Number(
            row.querySelector('[data-f="price"]').value
        );

        const duration=
            row.querySelector('[data-f="duration"]').value;

        if(!name){
            showToast("Nama paket belum diisi");
            return;
        }

        if(price<=0){
            showToast("Harga harus lebih dari 0");
            return;
        }

        const id=save.dataset.save;

        let res;

        if(id==="new"){

            const payload={
                provider_id:$("#adminProvider").value,
                name:name,
                price:price,
                duration:duration,
                tag:"Internet",
                active:true
            };

            res=await sb
                .from("packages")
                .insert(payload);

        }else{

            res=await sb
                .from("packages")
                .update({
                    name:name,
                    price:price,
                    duration:duration
                })
                .eq("id",id);

        }

        if(res.error){

            showToast(res.error.message);

        }else{

            showToast("Paket berhasil disimpan");

            await renderAdmin();
            await loadData();

        }

        return;
    }


    const del=e.target.closest("[data-del]");

    if(del){

        const id=del.dataset.del;

        if(id==="new"){
            drawAdminRows();
            return;
        }

        if(!confirm("Hapus paket ini?")){
            return;
        }

        const res=await sb
            .from("packages")
            .delete()
            .eq("id",id);

        if(res.error){

            showToast(res.error.message);

        }else{

            showToast("Paket dihapus");

            await renderAdmin();
            await loadData();

        }

    }

};
}

function showToast(t){const x=$("#toast");x.textContent=t;x.hidden=false;setTimeout(()=>x.hidden=true,2500)}
loadData();
  
