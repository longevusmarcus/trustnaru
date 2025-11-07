import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface VoiceBubbleProps {
  onTranscription?: (text: string) => void;
}

export const VoiceBubble = ({ onTranscription }: VoiceBubbleProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak now...",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to convert audio to base64');
        }

        console.log('Sending audio to transcription...');
        
        const { data, error } = await supabase.functions.invoke('transcribe-voice', {
          body: { audio: base64Audio }
        });

        if (error) {
          throw error;
        }

        const transcription = data?.text || '';
        
        if (transcription) {
          // Save voice transcript to user profile immediately
          if (user) {
            const { error: saveError } = await supabase
              .from('user_profiles')
              .update({ voice_transcription: transcription })
              .eq('user_id', user.id);
            
            if (saveError) {
              console.error('Error saving voice transcript:', saveError);
            }
          }
          
          toast({
            title: "Transcription complete",
            description: transcription,
          });
          onTranscription?.(transcription);
        } else {
          toast({
            title: "No speech detected",
            description: "Please try speaking again",
            variant: "destructive",
          });
        }
        
        setIsProcessing(false);
      };
      
      reader.onerror = () => {
        throw new Error('Failed to read audio file');
      };
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      startRecording();
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className="relative group"
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {/* Outer glow with elegant pulse - matching crystal ball */}
        <div className={`absolute inset-0 rounded-full ${
          isRecording 
            ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 blur-3xl animate-[pulse_4s_ease-in-out_infinite]' 
            : 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 blur-3xl group-hover:from-emerald-400/30 group-hover:to-emerald-600/20'
        } transition-all duration-300`} style={{ 
          transform: 'scale(1.8)',
        }} />
        
        {/* Middle glow layer - matching crystal ball */}
        <div className={`absolute inset-1 rounded-full ${
          isRecording
            ? 'bg-gradient-to-br from-emerald-300/40 to-emerald-500/30 blur-2xl animate-[pulse_3s_ease-in-out_infinite]'
            : 'bg-gradient-to-br from-emerald-300/30 to-emerald-500/20 blur-2xl'
        } transition-all duration-300`} style={{
          transform: 'scale(1.4)',
        }} />
        
        {/* Main crystal ball bubble */}
        <div className={`
          relative w-20 h-20 rounded-full 
          bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25
          backdrop-blur-sm
          flex items-center justify-center
          border border-emerald-400/20
          shadow-2xl
          transition-all duration-300
          ${isRecording ? 'scale-110 animate-[pulse_3.5s_ease-in-out_infinite]' : 'group-hover:scale-105'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}>
          {/* Inner sphere with light reflection - matching crystal ball */}
          <div className={`
            w-14 h-14 rounded-full 
            bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30
            backdrop-blur-md relative overflow-hidden
            ${isRecording ? 'animate-pulse' : ''}
          `}>
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/30 blur-md" />
            <div className="absolute bottom-3 left-3 w-6 h-6 rounded-full bg-emerald-200/20 blur-lg" />
          </div>
          
          {/* Center dot indicator */}
          <div className={`
            absolute w-2 h-2 rounded-full 
            ${isRecording ? 'bg-white animate-pulse' : 'bg-white/60'}
            ${isProcessing ? 'animate-spin' : ''}
            transition-all duration-300
          `} />
          
          {/* Recording indicator text */}
          {isRecording && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-light text-emerald-600 animate-pulse">
                Recording...
              </span>
            </div>
          )}
          
          {/* Processing indicator text */}
          {isProcessing && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-light text-muted-foreground">
                Processing...
              </span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
};
