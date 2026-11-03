import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { leerDatosAdmin } from './crearAdmin.js';

test('lee JSON UTF-8 por stdin y acepta BOM y saltos de línea de Windows', async () => {
  const datos = { nombre: 'Iván', nombreUsuario: 'admin', email: 'admin@example.test', password: 'ClaveDePrueba123' };
  const entrada = Readable.from([Buffer.from('\uFEFF'), Buffer.from(JSON.stringify(datos)), Buffer.from('\r\n')]);
  assert.deepEqual(await leerDatosAdmin(entrada), datos);
});

test('sin datos o desde terminal interactiva explica cómo ejecutar el comando', async () => {
  await assert.rejects(leerDatosAdmin(Readable.from([])), /ejemplo de PowerShell/);
  await assert.rejects(leerDatosAdmin({ isTTY: true }), /ejemplo de PowerShell/);
});

test('rechaza entradas inválidas sin imprimir credenciales', async () => {
  for (const contenido of ['[]', 'null', '42', '{"password":"secreto"']) {
    await assert.rejects(leerDatosAdmin(Readable.from([contenido])), error => !error.message.includes('secreto') && /JSON/.test(error.message));
  }
  await assert.rejects(leerDatosAdmin(Readable.from(['x'.repeat(16385)])), /tamaño permitido/);
});

test('un proceso Node recibe el JSON enviado por una tubería real', () => {
  const modulo = new URL('./crearAdmin.js', import.meta.url).href;
  const proceso = spawnSync(process.execPath, ['--input-type=module', '-e', `import { leerDatosAdmin } from ${JSON.stringify(modulo)}; const datos = await leerDatosAdmin(); console.log(datos.nombreUsuario);`], { input: '{"nombreUsuario":"admin"}\r\n', encoding: 'utf8' });
  assert.equal(proceso.status, 0, proceso.stderr);
  assert.equal(proceso.stdout.trim(), 'admin');
});
