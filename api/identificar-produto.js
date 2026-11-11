/* AEGO · IA que identifica o produto pelas fotos (função serverless da Vercel)
   Configure na Vercel: GEMINI_API_KEY (grátis em https://aistudio.google.com/apikey)
   Opcional: GEMINI_MODEL, OPENAI_API_KEY, OPENAI_MODEL, PAINEL_TOKEN */

const LADOS = ['frente', 'direita', 'verso', 'esquerda', 'topo', 'base'];
const MAX_FOTOS = 6;
const MAX_BYTES_FOTO = 1_400_000;

const PROMPT = `Você é especialista em produtos de barbearia vendidos no Brasil (pomadas, ceras, argilas, pastas, géis, óleos e balms para barba, pós texturizadores, sprays).
As fotos mostram UM produto, de vários ângulos (o lado de cada foto vem indicado antes dela).
1) Leia o rótulo com atenção (marca, nome da linha, peso/volume, tipo de fixação e brilho escritos na embalagem).
2) Se reconhecer o produto real, use o que você sabe dele. Se não reconhecer, descreva pelo que dá para ver e diga isso em "observacao".
3) Estime o preço de venda atual no varejo brasileiro em reais (barbearias costumam vender um pouco acima do preço de mercado).
4) Para CADA foto, devolva a caixa do produto [ymin, xmin, ymax, xmax] normalizada de 0 a 1000.
Responda SOMENTE com JSON válido, sem markdown, exatamente neste formato:
{
 "identificado": true,
 "confianca": 0.0,
 "nome": "nome comercial completo",
 "marca": "",
 "categoria": "Pomada | Cera | Argila | Pasta | Gel | Óleo | Balm | Pó | Spray | Shampoo | Outro",
 "fixacao": 1,
 "brilho": "Fosco | Baixo | Médio | Alto",
 "conteudo": "ex.: 70 g",
 "indicacao": "para que tipo de cabelo/barba e estilo",
 "descricao": "2 a 3 frases curtas, tom de vendedor de barbearia, em português do Brasil, sem exagero",
 "comoUsar": "1 frase",
 "destaques": ["até 4 pontos curtos"],
 "precoSugerido": 0,
 "faixaPreco": { "min": 0, "max": 0 },
 "formato": "lata | pote | frasco | tubo | bisnaga | spray | outro",
 "caixas": { "frente": [0,0,1000,1000] },
 "observacao": ""
}
fixacao vai de 1 (leve) a 5 (extra forte). confianca vai de 0 a 1.`;

function json(res, status, corpo) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(corpo));
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const partes = [];
  let total = 0;
  for await (const p of req) { total += p.length; if (total > 9_000_000) throw new Error('grande'); partes.push(p); }
  return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');
}

function separarDataURL(u) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(u || ''));
  if (!m) return null;
  if (m[2].length * 0.75 > MAX_BYTES_FOTO) return null;
  return { mime: m[1], dados: m[2] };
}

function extrairJSON(txt) {
  if (!txt) return null;
  const limpo = String(txt).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(limpo); } catch (e) {}
  const i = limpo.indexOf('{'), f = limpo.lastIndexOf('}');
  if (i >= 0 && f > i) { try { return JSON.parse(limpo.slice(i, f + 1)); } catch (e) {} }
  return null;
}

function normalizar(p) {
  const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const num = (v) => { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
  const caixa = (c) => Array.isArray(c) && c.length === 4 && c.every((v) => isFinite(Number(v))) ? c.map((v) => Math.max(0, Math.min(1000, Math.round(Number(v))))) : null;
  const caixas = {};
  if (p && p.caixas && typeof p.caixas === 'object') LADOS.forEach((k) => { const c = caixa(p.caixas[k]); if (c) caixas[k] = c; });
  return {
    identificado: !!(p && p.identificado),
    confianca: Math.max(0, Math.min(1, num(p && p.confianca))),
    nome: t(p && p.nome, 80), marca: t(p && p.marca, 40), categoria: t(p && p.categoria, 30),
    fixacao: Math.max(0, Math.min(5, Math.round(num(p && p.fixacao)))), brilho: t(p && p.brilho, 20),
    conteudo: t(p && p.conteudo, 20), indicacao: t(p && p.indicacao, 120),
    descricao: t(p && p.descricao, 600), comoUsar: t(p && p.comoUsar, 300),
    destaques: Array.isArray(p && p.destaques) ? p.destaques.slice(0, 4).map((x) => t(x, 60)) : [],
    precoSugerido: Math.max(0, Math.min(5000, num(p && p.precoSugerido))),
    faixaPreco: { min: num(p && p.faixaPreco && p.faixaPreco.min), max: num(p && p.faixaPreco && p.faixaPreco.max) },
    formato: t(p && p.formato, 20), caixas, observacao: t(p && p.observacao, 200)
  };
}

async function comGemini(fotos, chave) {
  const modelo = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts = [{ text: PROMPT }];
  fotos.forEach((f) => { parts.push({ text: 'Foto: ' + f.lado }); parts.push({ inline_data: { mime_type: f.mime, data: f.dados } }); });
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ('gemini ' + r.status)); e.status = r.status; throw e; }
  const txt = (((j.candidates || [])[0] || {}).content || {}).parts ? j.candidates[0].content.parts.map((p) => p.text || '').join('') : '';
  return { produto: extrairJSON(txt), modelo };
}

async function comOpenAI(fotos, chave) {
  const modelo = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const content = [{ type: 'text', text: PROMPT }];
  fotos.forEach((f) => { content.push({ type: 'text', text: 'Foto: ' + f.lado }); content.push({ type: 'image_url', image_url: { url: 'data:' + f.mime + ';base64,' + f.dados, detail: 'high' } }); });
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + chave },
    body: JSON.stringify({ model: modelo, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ('openai ' + r.status)); e.status = r.status; throw e; }
  return { produto: extrairJSON(((j.choices || [])[0] || {}).message && j.choices[0].message.content), modelo };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, erro: 'metodo' });
  const token = process.env.PAINEL_TOKEN;
  if (token && req.headers['x-painel-token'] !== token) return json(res, 401, { ok: false, erro: 'token' });
  const gem = process.env.GEMINI_API_KEY, oai = process.env.OPENAI_API_KEY;
  if (!gem && !oai) return json(res, 501, { ok: false, erro: 'sem-chave', msg: 'Configure GEMINI_API_KEY (ou OPENAI_API_KEY) nas variáveis de ambiente da Vercel.' });

  let corpo;
  try { corpo = await lerCorpo(req); } catch (e) { return json(res, 413, { ok: false, erro: 'grande' }); }
  const fotos = (Array.isArray(corpo && corpo.fotos) ? corpo.fotos : []).slice(0, MAX_FOTOS).map((f) => {
    const s = separarDataURL(f && f.img);
    return s && { lado: LADOS.includes(f.lado) ? f.lado : 'frente', mime: s.mime, dados: s.dados };
  }).filter(Boolean);
  if (!fotos.length) return json(res, 400, { ok: false, erro: 'sem-fotos' });

  try {
    const r = gem ? await comGemini(fotos, gem) : await comOpenAI(fotos, oai);
    if (!r.produto) return json(res, 502, { ok: false, erro: 'resposta' });
    return json(res, 200, { ok: true, produto: normalizar(r.produto), modelo: r.modelo });
  } catch (e) {
    console.error('[identificar-produto]', e && e.message);
    return json(res, e && e.status === 429 ? 429 : 502, { ok: false, erro: e && e.status === 429 ? 'limite' : 'ia', msg: String(e && e.message || '').slice(0, 200) });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '8mb' } } };
