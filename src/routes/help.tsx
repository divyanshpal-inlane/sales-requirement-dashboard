import { Phone, Mail, MessageCircle, HelpCircle } from "lucide-react";

export default function HelpSupport() {
  const handleCall = () => {
    window.location.href = "tel:+916360739863";
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/916360739863", "_blank");
  };

  const handleEmail = () => {
    window.location.href = "mailto:team@inlane.in";
  };

  return (
    <div className="flex h-full w-full p-6 pb-20">
      <div className="flex h-full w-full flex-col">
        <h1 className="mb-8 text-3xl font-bold text-gray-800">
          Help & Support
        </h1>

        <div className="flex-1 space-y-8 overflow-y-auto">
          {/* Contact Options Card */}
          <div className="rounded-lg bg-gray-50 p-6">
            <h2 className="mb-6 text-xl font-medium text-gray-700">
              Get in Touch
            </h2>

            <div className="space-y-4">
              <button
                onClick={handleCall}
                className="flex w-full items-center gap-4 rounded-lg bg-primary p-5 text-white transition-colors hover:bg-primary/90"
              >
                <Phone size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">Call Us</span>
                  <span className="text-base opacity-90">+91 6360739863</span>
                </div>
              </button>

              <button
                onClick={handleWhatsApp}
                className="flex w-full items-center gap-4 rounded-lg border-2 border-green-500 p-5 text-green-600 transition-colors hover:bg-green-50"
              >
                <MessageCircle size={24} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-lg font-medium">WhatsApp</span>
                  <span className="text-base opacity-70">Quick support</span>
                </div>
              </button>

              <button
                onClick={handleEmail}
                className="flex w-full items-center gap-4 rounded-lg border border-gray-300 p-5 transition-colors hover:bg-gray-50"
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
          <div className="flex items-start gap-4 rounded-lg border border-primary bg-white p-5">
            <HelpCircle className="mt-1 h-6 w-6 flex-shrink-0 text-primary" />
            <p className="text-base text-gray-700">
              Our team will contact you within <strong>24 hours</strong> to
              assist you with your queries.
            </p>
          </div>

          {/* Additional Help Section */}
          <div className="rounded-lg bg-accent-purple/5 p-6 text-center">
            <h3 className="mb-3 text-xl font-medium text-accent-purple">
              Need More Help?
            </h3>
            <p className="mb-6 text-base text-gray-600">
              Can't find what you're looking for? Our support team is here to
              help you with any questions about our driving courses.
            </p>
            <button
              onClick={handleCall}
              className="rounded-lg bg-accent-purple px-8 py-3 text-lg text-white transition-colors hover:bg-accent-purple/90"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
