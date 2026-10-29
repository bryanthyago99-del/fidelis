export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const data = url.searchParams.get('data');

  if (!data) {
    return new Response(JSON.stringify({ ok: false, error: 'Parâmetro data obrigatório.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, ocupados: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await env.DB.prepare('SELECT hora FROM agendamentos WHERE data = ? AND status != ? ORDER BY hora ASC')
    .bind(data, 'cancelado')
    .all();

  const ocupados = (result.results || []).map((item) => item.hora).filter(Boolean);

  return new Response(JSON.stringify({ ok: true, data, ocupados }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
