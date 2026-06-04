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
  checkCapabilities();
  checkDesktopDist();
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

  [
    'verify',
    'test:browser',
    'desktop:check',
    'desktop:prepare',
    'desktop:gate',
    'desktop:dev',
    'desktop:build'
  ].forEach(scriptName => {

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
    'Tauri использует production frontendDist dist-desktop',
    config.build?.frontendDist === '../dist-desktop'
  );

  addCheck(
    'Tauri готовит frontend перед production build',
    config.build?.beforeBuildCommand === 'npm run desktop:prepare'
  );

  addCheck(
    'Tauri bundle включен для installer/portable build',
    config.bundle?.active === true
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


function checkCapabilities() {

  const capability =
    readJson(
      'src-tauri/capabilities/default.json'
    );

  const permissions =
    new Set(
      capability.permissions || []
    );

  const windows =
    new Set(
      capability.windows || []
    );

  addCheck(
    'Tauri capability разрешает создание окна презентации',
    permissions.has('core:webview:allow-create-webview-window')
  );

  addCheck(
    'Tauri capability привязан к окну презентации',
    windows.has('campaign-map-presentation')
  );
}


function checkDesktopDist() {

  [
    'dist-desktop/index.html',
    'dist-desktop/presentation.html',
    'dist-desktop/js/app.js',
    'dist-desktop/styles/main.css',
    'dist-desktop/assets/icons/rpg-ui.svg',
    'dist-desktop/desktop-build-manifest.json'
  ].forEach(filePath => {

    addCheck(
      `Desktop dist содержит ${filePath}`,
      fs.existsSync(
        path.join(
          ROOT,
          filePath
        )
      )
    );
  });
}


function checkDesktopDocs() {

  [
    'docs/DESKTOP_PACKAGING_SMOKE.md',
    'docs/DESKTOP_TRANSITION_STRATEGY.md',
    'docs/DESKTOP_PRESENTATION_WINDOW_SPIKE.md',
    'docs/DESKTOP_RELEASE_POLICY.md'
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
