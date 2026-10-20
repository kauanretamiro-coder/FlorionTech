
import { createClient } from
  "npm:@supabase/supabase-js@2";

const encoder = new TextEncoder();

function tokenValido(recebido: string, esperado: string) {
  const a = encoder.encode(recebido);
  const b = encoder.encode(esperado);

  // Compara os valores sem parar na primeira diferença.
  let diferenca = a.length ^ b.length;
  const tamanho = Math.max(a.length, b.length);

  for (let i = 0; i < tamanho; i++) {
    diferenca |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return diferenca === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { erro: "Método não permitido" },
      { status: 405 }
    );
  }

  const tokenEsperado = Deno.env.get("FLORION_DEVICE_TOKEN");
  const tokenRecebido = req.headers.get("x-device-token") ?? "";

  if (
    !tokenEsperado ||
    !tokenRecebido ||
    !tokenValido(tokenRecebido, tokenEsperado)
  ) {
    return Response.json(
      { erro: "Dispositivo não autorizado" },
      { status: 401 }
    );
  }

  let corpo;

  try {
    corpo = await req.json();
  } catch {
    return Response.json(
      { erro: "JSON inválido" },
      { status: 400 }
    );
  }

  const { dispositivo, umidade, valor_bruto } = corpo;

  if (
    dispositivo !== "esp32-florion-01" ||
    typeof umidade !== "number" ||
    !Number.isFinite(umidade) ||
    umidade < 0 ||
    umidade > 100 ||
    !Number.isInteger(valor_bruto) ||
    valor_bruto < 0 ||
    valor_bruto > 4095
  ) {
    return Response.json(
      { erro: "Dados inválidos" },
      { status: 400 }
    );
  }

  const url = Deno.env.get("SUPABASE_URL");

  // Chave administrativa somente no servidor.
  const secretKeys = JSON.parse(
    Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"
  );

  const secretKey =
    secretKeys.default ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !secretKey) {
    return Response.json(
      { erro: "Configuração do servidor incompleta" },
      { status: 500 }
    );
  }

  const db = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { error } = await db
    .from("leituras_solo")
    .insert({
      dispositivo,
      umidade_percentual: umidade,
      valor_bruto
    });

  if (error) {
    console.error(error);
    return Response.json(
      { erro: "Falha ao salvar leitura" },
      { status: 500 }
    );
  }

  return Response.json({ sucesso: true }, { status: 201 });
});
