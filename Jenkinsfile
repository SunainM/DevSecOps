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
            withSonarQubeEnv('SonarCloud') {  // <-- name must match your Jenkins Sonar server entry
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
    stage('Quality Gate (poll SonarCloud API)') {
        steps {
            withSonarQubeEnv('SonarCloud') {
            sh '''
                set -e

                # 1) Read CE task info written by sonar-scanner
                if [ ! -f ".scannerwork/report-task.txt" ]; then
                echo "report-task.txt not found. Did sonar-scanner run?"
                exit 2
                fi
                CE_TASK_ID=$(grep '^ceTaskId=' .scannerwork/report-task.txt | cut -d= -f2)
                PROJECT_KEY=$(grep '^projectKey=' .scannerwork/report-task.txt | cut -d= -f2)
                echo "CE_TASK_ID=$CE_TASK_ID"
                echo "PROJECT_KEY=$PROJECT_KEY"

                # 2) Poll CE task until DONE
                ATTEMPTS=60
                SLEEP_SEC=5
                while [ $ATTEMPTS -gt 0 ]; do
                STATUS=$(curl -s -u $SONAR_AUTH_TOKEN: "$SONAR_HOST_URL/api/ce/task?id=$CE_TASK_ID" | sed -n 's/.*"status":"\\([^"]*\\)".*/\\1/p')
                echo "Compute Engine status: $STATUS"
                if [ "$STATUS" != "PENDING" ] && [ "$STATUS" != "IN_PROGRESS" ]; then
                    break
                fi
                ATTEMPTS=$((ATTEMPTS-1))
                sleep $SLEEP_SEC
                done

                if [ "$STATUS" != "SUCCESS" ]; then
                echo "SonarCloud CE task did not finish successfully (status=$STATUS)"
                exit 3
                fi

                # 3) Fetch Quality Gate result
                QG_STATUS=$(curl -s -u $SONAR_AUTH_TOKEN: "$SONAR_HOST_URL/api/qualitygates/project_status?projectKey=$PROJECT_KEY" \
                            | sed -n 's/.*"status":"\\([^"]*\\)".*/\\1/p')
                echo "Quality Gate: $QG_STATUS"

                if [ "$QG_STATUS" != "OK" ]; then
                echo "Quality Gate FAILED ($QG_STATUS). See SonarCloud dashboard."
                exit 4
                fi

                echo "Quality Gate PASSED."
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
