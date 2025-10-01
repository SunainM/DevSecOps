pipeline {
  agent any

  tools {
    nodejs "NODEJS_24"   // We'll define this tool name in Jenkins -> Global Tool Config
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps { sh 'npm ci' }
    }

    stage('Test (with coverage)') {
      steps { sh 'npm run ci:test' }
      post {
        always {
          junit 'reports/junit/*.xml' // keep if you already publish Jest JUnit
          archiveArtifacts artifacts: 'coverage/**', fingerprint: true, onlyIfSuccessful: false
        }
      }
    }

    stage('SonarCloud Analysis') {
      steps {
        withCredentials([string(credentialsId: 'SONAR_TOKEN', variable: 'SONAR_TOKEN')]) {
          sh '''
            set -e
            mkdir -p .scanner
            SCANNER_VERSION=6.2.1.4610
            if [ ! -x ".scanner/sonar-scanner-$SCANNER_VERSION-linux-x64/bin/sonar-scanner" ]; then
              curl -sSL -o .scanner/scanner.zip \
                https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-$SCANNER_VERSION-linux-x64.zip
              unzip -q .scanner/scanner.zip -d .scanner
              rm .scanner/scanner.zip
            fi
            export PATH="$PWD/.scanner/sonar-scanner-$SCANNER_VERSION-linux-x64/bin:$PATH"

            # Run scan; pass token securely via CLI (don’t commit it)
            sonar-scanner \
              -Dsonar.projectKey=$(grep '^sonar.projectKey=' sonar-project.properties | cut -d= -f2) \
              -Dsonar.organization=$(grep '^sonar.organization=' sonar-project.properties | cut -d= -f2) \
              -Dsonar.host.url=https://sonarcloud.io \
              -Dsonar.token=$SONAR_TOKEN
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit/*.xml', fingerprint: true, onlyIfSuccessful: false
    }
  }
}
