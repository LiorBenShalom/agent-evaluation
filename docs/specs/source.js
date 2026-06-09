'use strict';
(() => {
  const apps = [{ id: 'template', name: 'Template' }];

  const pageHeader = document.createElement('header');
  document.body.appendChild(pageHeader);
  pageHeader.innerHTML = '<h1 class="project-name">Connectors Framework</h1>';

  const params = new URLSearchParams(location.search);
  const spec = params.get('spec') || apps[0].id;
  window.specFilename = `openapi-${spec}.yaml`;

  const isDocPage = location.pathname.endsWith('doc') || location.pathname.endsWith('doc.html');
  const isViewPage = location.pathname.endsWith('view') || location.pathname.endsWith('view.html');

  for (let app of apps) {
    const p = document.createElement('p');
    p.innerText = `${app.name} API: `;

    const doc = document.createElement('a');
    doc.innerHTML = isDocPage && spec === app.id ? '<b>[doc]</b>' : 'doc';
    doc.href = `doc.html?spec=${app.id}`;
    p.appendChild(doc);
    p.appendChild(document.createTextNode(' - '));

    const view = document.createElement('a');
    view.innerHTML = isViewPage && spec === app.id ? '<b>[view]</b>' : 'view';
    view.href = `view.html?spec=${app.id}`;
    p.appendChild(view);
    p.appendChild(document.createTextNode(' - '));

    const download = document.createElement('a');
    download.innerHTML = 'download';
    download.href = `openapi-${app.id}.yaml`;
    p.appendChild(download);

    pageHeader.appendChild(p);
  }
})();
