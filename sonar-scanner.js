const dotenv = require('dotenv');
const scanner = require('sonarqube-scanner');

// config the environment
dotenv.config();

// The URL of the SonarQube server. Defaults to http://localhost:9000
const serverUrl = process.env.SONARQUBE_URL;

// The token used to connect to the SonarQube/SonarCloud server. Empty by default.
const token = process.env.SONARQUBE_TOKEN;

// projectKey must be unique in a given SonarQube instance
const projectKey = process.env.SONARQUBE_PROJECT_KEY;

// options Map (optional) Used to pass extra parameters for the analysis.
// See the [official documentation](https://docs.sonarqube.org/latest/analysis/analysis-parameters/) for more details.
const options = {
  'sonar.projectKey': projectKey,
  'sonar.projectName': projectKey,

  'sonar.language': 'typescript',
  'sonar.sources': 'src',
  'sonar.tests': 'src',
  'sonar.sourceEncoding': 'UTF-8',
  'sonar.test.inclusions': '**/*.spec.ts',
  'sonar.exclusions':
    '**/node_modules/**,**/*.spec.ts,src/test.ts,**/*.spec.ts,src/tests/setup.ts',

  'sonar.typescript.lcov.reportPaths': './coverage/lcov.info'
};

// parameters for sonarqube-scanner
const params = {
  serverUrl,
  login: token,
  options
};

const sonarScanner = async () => {
  console.log(serverUrl);

  if (!serverUrl) {
    console.log('SonarQube url not set. Nothing to do...');
    return;
  }

  //  Function Callback (the execution of the analysis is asynchronous).
  const callback = (result) => {
    console.log('Sonarqube scanner result:', result);
    process.exit();
  };

  scanner(params, callback);
};

sonarScanner().catch((err) => console.error('Error during sonar scan', err));
