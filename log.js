const LOG_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyAIRNSN5yaoSIKzxgf5rnme1ryxveWHmePMC6qRDtrkso3pZtQ-7iMW4pi94LbW1uS/exec';

function formatarDataLog() {
  const hoje = new Date();
  const dd = String(hoje.getDate()).padStart(2, '0');
  const mm = String(hoje.getMonth() + 1).padStart(2, '0');
  const aa = String(hoje.getFullYear()).slice(-2);
  return `${dd}/${mm}/${aa}`;
}

function montarMensagemLog(pagina, ok = false) {
  const data = formatarDataLog();
  return ok ? `${data} - OK ${pagina}` : `${data} - ${pagina}`;
}

async function registrarLogPagina(pagina, ok = false) {
  const codigo = (localStorage.getItem('chave') || '').toLowerCase().trim();

  if (!codigo) {
    console.warn('Sem chave no localStorage');
    return;
  }

  const mensagem = montarMensagemLog(pagina, ok);

  try {
    const resp = await fetch(LOG_WEBAPP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'logEvento',
        codigo,
        mensagem
      })
    });

    const texto = await resp.text();
    console.log('Status HTTP do log:', resp.status);
    console.log('Resposta bruta do log:', texto);

    let data = null;
    try {
      data = JSON.parse(texto);
    } catch (e) {
      console.error('Resposta do log não é JSON válido');
      return;
    }

    console.log('Resposta JSON do log:', data);

    if (data.status !== 'success') {
      console.warn('Log não gravado:', data);
    }

    return data;
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}
