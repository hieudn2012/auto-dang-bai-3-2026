import TextArea from "@/components/TextArea";

interface CaptionConfigProps {
  caption: string;
  setCaption: (value: string) => void;
}

const CaptionConfig = ({
  caption,
  setCaption
}: CaptionConfigProps) => {
  return (
    <div className="space-y-6">
      {/* Caption Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <i className="fas fa-closed-captioning text-purple-400 mr-1"></i>
          Caption Mặc Định
        </label>
        <TextArea 
          placeholder="Nhập caption" 
          value={caption} 
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[300px]"
        />
      </div>
    </div>
  );
};

export default CaptionConfig;