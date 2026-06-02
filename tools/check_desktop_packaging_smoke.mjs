import fs from 'node:fs';
import path from 'node:path';

const ROOT =
  process.cwd();

const checks =
  [];

main();


function main() {

  checkPackageScripts();
  checkTauriConfig();
  checkCargoFeatures();
  checkDesktopDocs();

  const failed =
    checks.filter(check => !check.ok);

  checks.forEach(check => {

    const mark =
      check.ok
        ? 'OK'
        : 'FAIL';

    console.log(
      `${mark} ${check.name}`
    );
  });

  if (failed.length) {

    process.exitCode =
      1;
  }
}


function checkPackageScripts() {

  const packageJson =
    readJson(
      'package.json'
    );

  const requiredScripts =
    [
      'verify',
      'test:browser',
      'desktop:check',
      'desktop:dev',
      'desktop:build'
    ];

  requiredScripts.forEach(scriptName => {

    addCheck(
      `package.json содержит script ${scriptName}`,
      Boolean(packageJson.scripts?.[scriptName])
    );
  });
}


function checkTauriConfig() {

  const config =
    readJson(
      'src-tauri/tauri.conf.json'
    );

  addCheck(
    'Tauri использует текущий static frontendDist',
    config.build?.frontendDist === '../'
  );

  addCheck(
    'Tauri bundle пока отключен для безопасного spike',
    config.bundle?.active === false
  );

  addCheck(
    'Tauri включает глобальный API для desktop bridge',
    config.app?.withGlobalTauri === true
  );

  addCheck(
    'Tauri включает asset protocol для картинок',
    config.app?.security?.assetProtocol?.enable === true
  );
}


function checkCargoFeatures() {

  const cargoToml =
    readText(
      'src-tauri/Cargo.toml'
    );

  addCheck(
    'Cargo включает Tauri protocol-asset feature',
    cargoToml.includes('protocol-asset')
  );
}


function checkDesktopDocs() {

  [
    'docs/DESKTOP_PACKAGING_SMOKE.md',
    'docs/DESKTOP_TRANSITION_STRATEGY.md',
    'docs/DESKTOP_PRESENTATION_WINDOW_SPIKE.md'
  ].forEach(filePath => {

    addCheck(
      `Документ существует: ${filePath}`,
      fs.existsSync(
        path.join(
          ROOT,
          filePath
        )
      )
    );
  });
}


function addCheck(
  name,
  ok
) {

  checks.push({
    name,
    ok: Boolean(ok)
  });
}


function readJson(
  relativePath
) {

  return JSON.parse(
    readText(
      relativePath
    )
  );
}


function readText(
  relativePath
) {

  return fs.readFileSync(
    path.join(
      ROOT,
      relativePath
    ),
    'utf8'
  );
}
