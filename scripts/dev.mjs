import { spawnSync } from 'node:child_process';
import net from 'node:net';

function getFreePort() {
	return new Promise((resolve, reject) => {
		const srv = net.createServer();
		srv.unref();
		srv.on('error', reject);
		srv.listen(0, () => {
			const { port } = srv.address();
			srv.close(() => resolve(port));
		});
	});
}

const port = process.env.PORT || 8888;
const functionsPort = await getFreePort();
const staticServerPort = await getFreePort();

const result = spawnSync(
	'npx',
	[
		'netlify',
		'dev',
		'--port',
		String(port),
		'--functions-port',
		String(functionsPort),
		'--staticServerPort',
		String(staticServerPort),
	],
	{ stdio: 'inherit', shell: true },
);
process.exit(result.status ?? 1);
