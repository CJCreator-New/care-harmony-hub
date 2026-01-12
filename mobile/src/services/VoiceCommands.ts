import Voice from '@react-native-voice/voice';
import { Alert } from 'react-native';

export class VoiceCommandManager {
  private isListening = false;
  private commands = [
    { patterns: ['open patients', 'show patients'], action: 'NAVIGATE_PATIENTS' },
    { patterns: ['my tasks', 'show tasks'], action: 'SHOW_TASKS' },
    { patterns: ['emergency', 'urgent'], action: 'EMERGENCY_ALERT' }
  ];
  
  constructor() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechError = this.onSpeechError;
  }
  
  async startListening(): Promise<void> {
    try {
      if (this.isListening) return;
      await Voice.start('en-US');
      this.isListening = true;
    } catch (error) {
      console.error('Voice start failed:', error);
    }
  }
  
  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Voice stop failed:', error);
    }
  }
  
  private onSpeechStart = () => {
    console.log('Voice recognition started');
  };
  
  private onSpeechEnd = () => {
    console.log('Voice recognition ended');
    this.isListening = false;
  };
  
  private onSpeechResults = (event: any) => {
    const results = event.value;
    if (results && results.length > 0) {
      const spokenText = results[0].toLowerCase();
      this.processVoiceCommand(spokenText);
    }
  };
  
  private onSpeechError = (event: any) => {
    console.error('Voice error:', event.error);
    this.isListening = false;
  };
  
  private processVoiceCommand(spokenText: string) {
    for (const command of this.commands) {
      for (const pattern of command.patterns) {
        if (spokenText.includes(pattern)) {
          this.executeCommand(command.action);
          return;
        }
      }
    }
    
    Alert.alert('Voice Command', `Command not recognized: "${spokenText}"`);
  }
  
  private executeCommand(action: string) {
    switch (action) {
      case 'NAVIGATE_PATIENTS':
        // Navigate to patients screen
        break;
      case 'SHOW_TASKS':
        // Navigate to tasks screen
        break;
      case 'EMERGENCY_ALERT':
        this.triggerEmergencyAlert();
        break;
    }
  }
  
  private triggerEmergencyAlert() {
    Alert.alert(
      'Emergency Alert',
      'Emergency alert triggered. All staff will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => console.log('Emergency alert sent') }
      ]
    );
  }
}