const BARBEIRO_WPP = '5535993335278';
const STORAGE_KEY = 'barbeariaFidelisAgendamentos';
const workerUrl = '';
const evolution_url = '';
const evolution_apikey = '';

function getAgendamentos() {
  try {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (error) {
    console.error('Erro ao ler agendamentos:', error);
    return [];
  }
}

function setAgendamentos(agendamentos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos));
}

function formatarDataHora(dataHora) {
  if (!dataHora) return '';
  const data = new Date(dataHora);
  if (Number.isNaN(data.getTime())) return dataHora;

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(data);
}

function montarMensagemCliente(nome, barbeiro, dataHora) {
  return `Fala ${nome}! Agendamento confirmado na Barbearia Fidelis com ${barbeiro} em ${formatarDataHora(dataHora)}. Funcionamos Seg a Sáb 8h-20h. Campestre-MG. Dúvidas: +55 35 9933-5278`;
}

function montarMensagemBarbeiro(nome, tel, barbeiro, dataHora) {
  return `🔥 NOVO AGENDAMENTO Barbearia Fidelis - Cliente: ${nome} Tel: ${tel} Barbeiro: ${barbeiro} Data: ${formatarDataHora(dataHora)} Horário funcionamento: Seg a Sáb 8h-20h`;
}

function montarLembreteCliente(nome, barbeiro, hora) {
  return `⏰ Lembrete: ${nome}, seu corte na Barbearia Fidelis com ${barbeiro} é em 1 HORA às ${hora}. Segunda a Sábado 8h-20h te esperamos!`;
}

function montarLembreteBarbeiro(nome, tel, barbeiro, hora) {
  return `⏰ LEMBRETE 1H: Cliente ${nome} (${tel}) com ${barbeiro} às ${hora} em 1h`;
}

async function enviarWhatsApp(numero, mensagem) {
  const cleanNumber = String(numero || '').replace(/\D/g, '');
  if (!cleanNumber || !mensagem) {
    return false;
  }

  const targetUrl = evolution_url || '';
  const apiKey = evolution_apikey || '';

  if (!targetUrl || !apiKey) {
    console.warn('Evolution API não configurada. Defina evolution_url e evolution_apikey.');
    return false;
  }

  try {
    const resposta = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: cleanNumber,
        message: mensagem
      })
    });

    if (!resposta.ok) {
      console.warn('Envio WhatsApp falhou:', resposta.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao chamar Evolution API:', error);
    return false;
  }
}

function enviarNotificacaoBrowser(titulo, corpo) {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    new Notification(titulo, { body: corpo });
    return true;
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification(titulo, { body: corpo });
      }
    });
  }

  return false;
}

async function dispararNotificacao(agendamento, tipo) {
  const mensagemCliente = tipo === 'cliente'
    ? montarLembreteCliente(agendamento.nomeCliente, agendamento.barbeiro, new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    : '';

  const mensagemBarbeiro = tipo === 'barbeiro'
    ? montarLembreteBarbeiro(agendamento.nomeCliente, agendamento.telefoneCliente, agendamento.barbeiro, new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    : '';

  if (agendamento.canal === 'WhatsApp') {
    if (tipo === 'cliente' && agendamento.notificarCliente) {
      await enviarWhatsApp(agendamento.telefoneCliente, mensagemCliente);
    }

    if (tipo === 'barbeiro' && agendamento.notificarBarbeiro) {
      await enviarWhatsApp(BARBEIRO_WPP, mensagemBarbeiro);
    }
    return;
  }

  if (tipo === 'cliente' && agendamento.notificarCliente) {
    enviarNotificacaoBrowser('Lembrete Barbearia Fidelis', mensagemCliente);
  }

  if (tipo === 'barbeiro' && agendamento.notificarBarbeiro) {
    enviarNotificacaoBrowser('Lembrete para o barbeiro', mensagemBarbeiro);
  }
}

async function registrarAgendamento(agendamento) {
  const agendamentos = getAgendamentos();
  agendamentos.push(agendamento);
  setAgendamentos(agendamentos);

  const payload = {
    ...agendamento,
    origin: 'barbeariafidelis.com.br'
  };

  if (workerUrl) {
    try {
      await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.warn('Worker indisponível no momento:', error);
    }
  }
}

async function processarAgendamento(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formStatus = document.getElementById('formStatus');
  const dados = new FormData(form);
  const nomeCliente = String(dados.get('nomeCliente') || '').trim();
  const telefoneCliente = String(dados.get('telefoneCliente') || '').trim();
  const barbeiro = String(dados.get('barbeiro') || '').trim();
  const dataHora = String(dados.get('dataHora') || '').trim();
  const canal = String(dados.get('canal') || 'WhatsApp');
  const notificarCliente = Boolean(dados.get('notificarCliente'));
  const notificarBarbeiro = Boolean(dados.get('notificarBarbeiro'));

  if (!nomeCliente || !telefoneCliente || !barbeiro || !dataHora) {
    formStatus.textContent = 'Preencha todos os campos obrigatórios.';
    return;
  }

  const agendamento = {
    id: Date.now().toString(36),
    nomeCliente,
    telefoneCliente,
    barbeiro,
    dataHora,
    canal,
    notificarCliente,
    notificarBarbeiro,
    lembreteEnviado: false,
    createdAt: new Date().toISOString()
  };

  try {
    if (agendamento.notificarCliente && canal === 'WhatsApp') {
      await enviarWhatsApp(agendamento.telefoneCliente, montarMensagemCliente(agendamento.nomeCliente, agendamento.barbeiro, agendamento.dataHora));
    }

    if (agendamento.notificarBarbeiro && canal === 'WhatsApp') {
      await enviarWhatsApp(BARBEIRO_WPP, montarMensagemBarbeiro(agendamento.nomeCliente, agendamento.telefoneCliente, agendamento.barbeiro, agendamento.dataHora));
    }

    if (agendamento.canal === 'Notificação do Navegador') {
      if (agendamento.notificarCliente) {
        enviarNotificacaoBrowser('Agendamento confirmado', `Olá ${agendamento.nomeCliente}! Seu agendamento foi registrado.`);
      }
      if (agendamento.notificarBarbeiro) {
        enviarNotificacaoBrowser('Novo agendamento', `Cliente: ${agendamento.nomeCliente}. Barbeiro: ${agendamento.barbeiro}.`);
      }
    }

    await registrarAgendamento(agendamento);
    form.reset();
    formStatus.textContent = 'Agendamento registrado com sucesso.';
  } catch (error) {
    console.error('Falha ao registrar agendamento:', error);
    formStatus.textContent = 'Não foi possível registrar o agendamento no momento.';
  }
}

function verificarLembretes() {
  const agendamentos = getAgendamentos();
  const agora = Date.now();

  agendamentos.forEach((agendamento) => {
    if (!agendamento.dataHora || agendamento.lembreteEnviado) {
      return;
    }

    const dataPrevista = new Date(agendamento.dataHora).getTime();
    const diferenca = dataPrevista - agora;

    if (diferenca <= 3600000 && diferenca > 0) {
      if (agendamento.notificarCliente) {
        dispararNotificacao(agendamento, 'cliente');
      }

      if (agendamento.notificarBarbeiro) {
        dispararNotificacao(agendamento, 'barbeiro');
      }

      agendamento.lembreteEnviado = true;
    }
  });

  setAgendamentos(agendamentos);
}

function inicializarAgenda() {
  const form = document.getElementById('agendaForm');
  if (!form) {
    return;
  }

  form.addEventListener('submit', processarAgendamento);

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  setInterval(verificarLembretes, 60000);
  verificarLembretes();
}

document.addEventListener('DOMContentLoaded', inicializarAgenda);
