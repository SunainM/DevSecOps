pipeline {
  agent any

  tools {
    nodejs "NODEJS_24"
  }

  options {
    timestamps()
    ansiColor('xterm')
  }

  stages {
    stage('Build') {
      steps {
        echo "🔨 Building the project (dummy build step for now)..."
        // Example: if packaging into Docker
        // sh 'docker build -t my-inventory-app:latest .'
        sh 'npm install'  // simple build step for Node.js
      }
    }

    stage('Test') {
      steps {
        sh 'npm run ci:test'
      }
      post {
        always {
          junit 'reports/junit/*.xml'
          archiveArtifacts artifacts: 'coverage/**', fingerprint: true, onlyIfSuccessful: false
        }
      }
    }

    stage('Code Quality Analysis') {
      steps {
        withSonarQubeEnv('SonarCloud') {
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

            sonar-scanner \
              -Dsonar.projectKey=$(grep '^sonar.projectKey=' sonar-project.properties | cut -d= -f2) \
              -Dsonar.organization=$(grep '^sonar.organization=' sonar-project.properties | cut -d= -f2) \
              -Dsonar.host.url=$SONAR_HOST_URL \
              -Dsonar.token=$SONAR_AUTH_TOKEN
          '''
        }
      }
    }

    stage('Security') {
      steps {
        echo "🛡️ Running security scans (dummy stage)..."
        // Example: OWASP Dependency-Check
        // sh 'dependency-check --project my-app --scan . --format XML --out reports/security'
        // Example: npm audit
        // sh 'npm audit --json > reports/security-audit.json'
      }
    }

    stage('Deploy') {
      steps {
        echo "🚀 Deploying to staging environment (dummy stage)..."
        // Example: Docker Compose
        // sh 'docker-compose -f docker-compose.staging.yml up -d --build'
        // Example: AWS Elastic Beanstalk
        // sh 'eb deploy staging'
      }
    }

    stage('Release') {
      steps {
        echo "📦 Releasing to production (dummy stage)..."
        // Example: Octopus Deploy / AWS CodeDeploy
        // sh './deploy-to-prod.sh'
      }
    }

    stage('Monitoring & Alerting') {
      steps {
        echo "📊 Monitoring application (dummy stage)..."
        // Example: Datadog / New Relic
        // sh 'curl -X POST https://api.datadoghq.com/...'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit/*.xml', fingerprint: true, onlyIfSuccessful: false
    }
  }
}
