export class ConfigurationComponent {
  public readonly element: HTMLFormElement;
  private readonly script: HTMLDivElement;
  private readonly repo: HTMLInputElement;
  private readonly label: HTMLInputElement;
  private readonly theme: HTMLSelectElement;

  constructor() {
    this.element = document.createElement('form');
    this.element.innerHTML = `
      <h3 id="heading-repository">Repository</h3>
      <p>
        Choose the repository yttringar will connect to.
      </p>
      <fieldset>
        <div>
          <label for="repo">Repository:</label><br/>
          <input id="repo" class="custom-input" type="text" placeholder="Enter owner/repo">
        </div>
      </fieldset>

      <h3 id="heading-mapping">Blog Post ↔️ Issue Mapping</h3>
      <p>Choose the mapping between blog post pages and GitHub issues.</p>
      <fieldset>
        <div class="form-checkbox">
          <label>
            <input type="radio" value="pathname" name="mapping" checked="checked">
            Issue title contains page pathname
          </label>
        </div>
        <div class="form-checkbox">
          <label>
            <input type="radio" value="url" name="mapping">
            Issue title contains page URL
          </label>
        </div>
        <div class="form-checkbox">
          <label>
            <input type="radio" value="title" name="mapping">
            Issue title contains page title
          </label>
        </div>
        <div class="form-checkbox">
          <label>
            <input type="radio" value="og:title" name="mapping">
            Issue title contains page og:title
          </label>
        </div>
        <div class="form-checkbox">
          <label>
            <input type="radio" value="issue-number" name="mapping">
            Specific issue number
            <p class="note">
              You configure Yttringar to load a specific issue by number. Issues are not automatically
              created.
            </p>
          </label>
        </div>
        <div class="form-checkbox">
          <label>
            <input type="radio" value="specific-term" name="mapping">
            Issue title contains specific term
          </label>
        </div>
      </fieldset>
			<fieldset>
			  <div>
				<label for="label">Issue Label (optional):</label><br/>
				<input id="label" class="custom-input" type="text" placeholder="Enter label">
			  </div>
			</fieldset>
			<h3 id="heading-theme">Theme</h3>
			<p>Choose an Yttringar theme that matches your blog.</p>
			<select id="theme" class="form-select" aria-label="Theme">
			  <option value="github-light">GitHub Light</option>
			  <option value="github-dark">GitHub Dark</option>
			  <option value="github-dark-orange">GitHub Dark Orange</option>
			  <option value="icy-dark">Icy Dark</option>
			  <option value="dark-blue">Dark Blue</option>
			  <option value="photon-dark">Photon Dark</option>
			</select>

      <h3 id="heading-issue-label">Issue Label (optional)</h3>
      <p>
        Choose the label that will be assigned to issues created by Yttringar.
      </p>
      <fieldset>
        <div>
          <label for="label">Issue Label (optional):</label><br/>
        <p>
          Choose the label that will be assigned to issues created by Yttringar.
        </p>
          <input id="label" class="custom-input" type="text" placeholder="Enter label">
        <p class="note">
          Label names are case sensitive.
          The label must exist in your repo-
          Yttringar cannot attach labels that do not exist.
          Emoji are supported in label names.✨💬✨
        </p>
          <p class="note">
            Label names are case sensitive.
            The label must exist in your repo-
            Yttringar cannot attach labels that do not exist.
            Emoji are supported in label names.✨💬✨
          </p>
          <p class="note">
            Label names are case sensitive.
            The label must exist in your repo-
            Yttringar cannot attach labels that do not exist.
            Emoji are supported in label names.✨💬✨
          </p>
        </div>
      </fieldset>

      <h3 id="heading-theme">Theme</h3>
      <p>
        Choose an Yttringar theme that matches your blog.
        Can't find a theme you like?
        <a href="https://github.com/sebgroup/yttringar/blob/master/CONTRIBUTING.md">Contribute</a> a custom theme.
      </p>

      <select id="theme" class="form-select" value="github-light" aria-label="Theme">
        <option value="github-light">GitHub Light</option>
        <option value="github-dark">GitHub Dark</option>
        <option value="github-dark-orange">GitHub Dark Orange</option>
        <option value="icy-dark">Icy Dark</option>
        <option value="dark-blue">Dark Blue</option>
        <option value="photon-dark">Photon Dark</option>
      </select>

      <h3 id="heading-enable">Enable Yttringar</h3>

      <p>Add the following script tag to your blog's template. Position it where you want the
      comments to appear. Customize the layout using the <code>.yttringar</code> and
      <code>.yttringar-frame</code> selectors.
      </p>
      <div class="config-field" id="script" class="highlight highlight-text-html-basic"></div>
      <button id="copy-button" type="button" class="btn btn-blue code-action">Copy</button>
      <br/>
      <br/>`;

    this.element.addEventListener('submit', event => event.preventDefault());
    this.element.action = 'javascript:';

    this.script = this.element.querySelector('#script') as HTMLDivElement;

    this.repo = this.element.querySelector('#repo') as HTMLInputElement;

    this.label = this.element.querySelector('#label') as HTMLInputElement;

    this.theme = this.element.querySelector('#theme') as HTMLSelectElement;

    const themeStylesheet = document.getElementById('theme-stylesheet') as HTMLLinkElement;
    this.theme.addEventListener('change', () => {
      themeStylesheet.href = `/stylesheets/themes/${this.theme.value}/index.css`;
      const message = {
        type: 'set-theme',
        theme: this.theme.value
      };
      const yttringar = document.querySelector('iframe')!;
      yttringar.contentWindow!.postMessage(message, location.origin);
    });

    const copyButton = this.element.querySelector('#copy-button') as HTMLButtonElement;
    copyButton.addEventListener(
      'click',
      () => this.copyTextToClipboard(this.script.textContent as string));

    this.element.addEventListener('change', () => this.outputConfig());
    this.element.addEventListener('input', () => this.outputConfig());
    this.outputConfig();
  }

  private outputConfig() {
    const mapping = this.element.querySelector('input[name="mapping"]:checked') as HTMLInputElement;
    let mappingAttr: string;
    // tslint:disable-next-line:prefer-conditional-expression
    if (mapping.value === 'issue-number') {
      mappingAttr = this.makeConfigScriptAttribute('issue-number', '[ENTER ISSUE NUMBER HERE]');
    } else if (mapping.value === 'specific-term') {
      mappingAttr = this.makeConfigScriptAttribute('issue-term', '[ENTER TERM HERE]');
    } else {
      mappingAttr = this.makeConfigScriptAttribute('issue-term', mapping.value);
    }
    this.script.innerHTML = this.makeConfigScript(
      this.makeConfigScriptAttribute('repo', this.repo.value === '' ? 'owner/repo' : this.repo.value) + '\n' +
      mappingAttr + '\n' +
      (this.label.value ? this.makeConfigScriptAttribute('label', this.label.value) : '') +
      this.makeConfigScriptAttribute('theme', this.theme.value) + '\n' +
      this.makeConfigScriptAttribute('crossorigin', 'anonymous'));
  }

  private makeConfigScriptAttribute(name: string, value: string) {
    // tslint:disable-next-line:max-line-length
    return `<span class="pl-s1">        <span class="pl-e">${name}</span>=<span class="pl-s"><span class="pl-pds">"</span>${value}<span class="pl-pds">"</span></span></span>`;
  }

  private makeConfigScript(attrs: string) {
    // tslint:disable-next-line:max-line-length
    return "<p> Sorry this isnt implemented yet</p>"
    // return `<pre><span class="pl-s1">&lt;<span class="pl-ent">script</span> <span class="pl-e">src</span>=<span class="pl-s"><span class="pl-pds">"</span><url-for-yttringar>/client.js<span class="pl-pds">"</span></span></span>\n${attrs}\n<span class="pl-s1">        <span class="pl-e">async</span>&gt;</span>\n<span class="pl-s1">&lt;/<span class="pl-ent">script</span>&gt;</span></pre>`;
  }

  private copyTextToClipboard(text: string) {
    const textArea = document.createElement('textarea');
    // tslint:disable-next-line:max-line-length
    textArea.style.cssText = `position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;box-shadow:none;background:transparent`;
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      // tslint:disable-next-line:no-empty
    } catch (err) { }
    document.body.removeChild(textArea);
  }
}
