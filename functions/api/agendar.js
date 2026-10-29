export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Método não permitido.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const nome = String(body.nome || '').trim();
    const whatsappCliente = String(body.whatsapp_cliente || body.whatsapp || '').trim();
    const servico = String(body.servico || '').trim();
    const data = String(body.data || '').trim();
    const hora = String(body.hora || '').trim();

    if (!nome || !whatsappCliente || !servico || !data || !hora) {
      return new Response(JSON.stringify({ ok: false, error: 'Dados incompletos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanPhone = whatsappCliente.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return new Response(JSON.stringify({ ok: false, error: 'WhatsApp inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!env.DB) {
      return new Response(JSON.stringify({ ok: false, error: 'Banco D1 não configurado.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB.prepare(
      'INSERT INTO agendamentos (nome, whatsapp_cliente, servico, data, hora, status) VALUES (?, ?, ?, ?, ?, ?)' 
    )
      .bind(nome, cleanPhone, servico, data, hora, 'pendente')
      .run();

    const dataFormatada = new Date(`${data}T00:00:00`);
    const dia = String(dataFormatada.getDate()).padStart(2, '0');
    const mes = String(dataFormatada.getMonth() + 1).padStart(2, '0');
    const ano = dataFormatada.getFullYear();
    const diaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dataFormatada.getDay()];
    const whatsappLink = `https://wa.me/5535999335278?text=${encodeURIComponent(
      ['Oi Douglas! Quero agendar', `*Nome:* ${nome}`, `*Serviço:* ${servico}`, `*Data:* ${dia}/${mes}/${ano} (${diaSemana})`, `*Hora:* ${hora}`, `*Meu WhatsApp:* ${cleanPhone}`].join('\n')
    )}`;

    return new Response(
      JSON.stringify({
        ok: true,
        id: result.meta.last_row_id,
        whatsapp_link: whatsappLink,
        message: 'Agendamento salvo com sucesso.'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message || 'Erro interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
