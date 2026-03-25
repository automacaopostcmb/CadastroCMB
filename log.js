const LOG_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec';

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

    const data = await resp.json();
    console.log('Resposta do log:', data);
    return data;
  } catch (err) {
    console.error('Erro ao registrar log:', err);
  }
}
