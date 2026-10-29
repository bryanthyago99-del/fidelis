export async function onRequest({ env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, itens: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await env.DB.prepare(
    'SELECT id, nome, whatsapp_cliente, servico, data, hora, status, criado_em FROM agendamentos ORDER BY criado_em DESC'
  ).all();

  return new Response(JSON.stringify({ ok: true, itens: result.results || [] }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
