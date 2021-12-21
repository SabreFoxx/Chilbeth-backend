pipeline {
	agent { label 'node-app-agent-image' }
	options { timeout (time: 30) }
	stages {
		stage('install') {
			steps {
				sh 'npm clean-install'
			}
		}
		stage('start-server') {
			steps {
				fileOperations([folderCopyOperation(
                    sourceFolderPath: './',
                    destinationFolderPath: '/home/jenkins/mount-to-host-folder/Chilbeth'
                )])
			}
		}
	}
}