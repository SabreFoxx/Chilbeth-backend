pipeline {
	agent { label 'nodejs-docker-label' }
	options { timeout (time: 30) }
	stages {
		stage('build') {
			steps {
				sh 'npm clean-install'
			}
		}
		stage('install') {
			steps {
				fileOperations([folderCopyOperation(
                    sourceFolderPath: './',
                    destinationFolderPath: '/home/jenkins/mount-to-host-folder/Chilbeth-backend'
                )])
			}
		}
	}
}