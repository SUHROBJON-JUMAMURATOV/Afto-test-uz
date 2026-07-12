// payments.js — obuna sotib olish logikasi

let selectedPlanId = null;

async function loadPlans() {
  if (!requireLoginOrRedirect()) return;

  try {
    const plans = await apiFetch('/subscriptions/plans');
    const status = await apiFetch('/subscriptions/status');

    if (status.is_pro) {
      const until = new Date(status.subscription.expires_at).toLocaleDateString('uz-UZ');
      document.getElementById('currentStatus').innerHTML =
        `<div class="card"><span class="badge-pro">PRO</span> <span class="muted">Obuna muddati: ${until} gacha</span></div>`;
    }

    const container = document.getElementById('plansContainer');
    container.innerHTML = '';
    plans.forEach((plan, i) => {
      const div = document.createElement('div');
      div.className = 'plan-card';
      div.innerHTML = `
        <div>
          <div class="card-title">${plan.name} ${i === 1 ? '<span class="plan-badge">Mashhur</span>' : ''}</div>
          <div class="card-sub">${plan.duration_days} kun to'liq kirish</div>
        </div>
        <div class="price">${plan.price.toLocaleString('uz-UZ')} so'm</div>
      `;
      div.onclick = () => selectPlan(plan.id, div);
      container.appendChild(div);
    });
  } catch (e) {
    document.getElementById('plansContainer').innerHTML = `<p class="error-msg">${e.message}</p>`;
  }
}

function selectPlan(planId, el) {
  selectedPlanId = planId;
  document.querySelectorAll('.plan-card').forEach((c) => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('providerSection').style.display = 'block';
}

async function payWith(provider) {
  if (!selectedPlanId) return;
  try {
    const data = await apiFetch('/payments/create-invoice', {
      method: 'POST',
      body: JSON.stringify({ plan_id: selectedPlanId, provider })
    });
    // Foydalanuvchini Click yoki Payme to'lov sahifasiga yo'naltiramiz
    window.location.href = data.payment_url;
  } catch (e) {
    alert("To'lovni boshlashda xatolik: " + e.message);
  }
}

window.payWith = payWith;
