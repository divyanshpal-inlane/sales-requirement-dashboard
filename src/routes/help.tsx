import { Phone, Mail, MessageCircle, HelpCircle } from "lucide-react";

export default function HelpSupport() {
  const handleCall = () => {
    window.location.href = "tel:+919182031523";
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/919182031523", "_blank");
  };

  const handleEmail = () => {
    window.location.href = "mailto:team@inlane.in";
  };

  return (
    <div className="flex p-6 pb-20 w-full h-full">
      <div className="flex flex-col w-full h-full">
        <h1 className="mb-8 text-3xl font-bold text-gray-800">Help & Support</h1>
        
        <div className="overflow-y-auto flex-1 space-y-8">
          {/* Contact Options Card */}
          <div className="p-6 bg-gray-50 rounded-lg">
            <h2 className="mb-6 text-xl font-medium text-gray-700">Get in Touch</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleCall}
                className="flex gap-4 items-center p-5 w-full text-white rounded-lg transition-colors bg-primary hover:bg-primary/90"
              >
                <Phone size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">Call Us</span>
                  <span className="text-base opacity-90">+91 9182031523</span>
                </div>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex gap-4 items-center p-5 w-full text-green-600 rounded-lg border-2 border-green-500 transition-colors hover:bg-green-50"
              >
                <MessageCircle size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">WhatsApp</span>
                  <span className="text-base opacity-70">Quick support</span>
                </div>
              </button>

              <button
                onClick={handleEmail}
                className="flex gap-4 items-center p-5 w-full rounded-lg border border-gray-300 transition-colors hover:bg-gray-50"
              >
                <Mail size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">Email Support</span>
                  <span className="text-base opacity-70">team@inlane.in</span>
                </div>
              </button>
            </div>
          </div>

          {/* Response Time Alert */}
          <div className="flex gap-4 items-start p-5 bg-white rounded-lg border border-primary">
            <HelpCircle className="flex-shrink-0 mt-1 w-6 h-6 text-primary" />
            <p className="text-base text-gray-700">
              Our team will contact you within <strong>24 hours</strong> to assist you with your queries.
            </p>
          </div>

          {/* Additional Help Section */}
          <div className="p-6 text-center rounded-lg bg-accent-purple/5">
            <h3 className="mb-3 text-xl font-medium text-accent-purple">Need More Help?</h3>
            <p className="mb-6 text-base text-gray-600">
              Can't find what you're looking for? Our support team is here to help you with any questions about our driving courses.
            </p>
            <button 
              onClick={handleCall}
              className="px-8 py-3 text-lg text-white rounded-lg transition-colors bg-accent-purple hover:bg-accent-purple/90"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
