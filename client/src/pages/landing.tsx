import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, Clock, Users, CheckCircle } from "lucide-react";



export default function Landing() {
  const { toast } = useToast();

  const handleSignUp = () => {
    // Direct redirect to OAuth login since we use Replit authentication
    window.location.href = '/api/login';
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Knets</h1>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/api/login'}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleSignUp}
                className="bg-green-600 hover:bg-green-700"
              >
                Get Started
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/api/switch-user'}
                className="border-orange-600 text-orange-600 hover:bg-orange-50 text-sm"
              >
                Switch Account
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Manage Your Family's Digital Life with Confidence
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Take control of your children's device usage with smart scheduling, 
            remote monitoring, and emergency controls designed with families in mind.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleSignUp}
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3"
            >
              Get Started
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/api/login'}
              size="lg"
              className="border-green-600 text-green-600 hover:bg-green-50 text-lg px-8 py-3"
            >
              Sign In
            </Button>
          </div>
          <div className="text-sm text-gray-500 mt-4 space-y-2">
            <p>
              <strong>Testing with different accounts:</strong>
            </p>
            <ul className="text-left max-w-md mx-auto space-y-1">
              <li>• Use incognito/private browsing mode</li>
              <li>• Or click{" "}
                <button 
                  onClick={() => window.location.href = '/api/complete-logout'}
                  className="text-green-600 hover:text-green-700 underline"
                >
                  Complete Logout
                </button>{" "}to logout from Replit entirely
              </li>
              <li>• Or use a different browser</li>
            </ul>
          </div>
        </div>
      </section>



      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Built for Modern Families
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-green-600/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Remote Control</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Lock and unlock devices remotely using IMEI and mobile number identification
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-600/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <CardTitle className="text-lg">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Set automatic lock schedules for bedtime, study hours, and family time
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-warning-orange/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-warning-orange" />
                </div>
                <CardTitle className="text-lg">Family Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Monitor all family devices from one secure, intuitive dashboard
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-12 h-12 bg-error-red/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-error-red" />
                </div>
                <CardTitle className="text-lg">Emergency Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Instant emergency unlock for urgent situations and family safety
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">
            Privacy & Consent First
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-trust-blue" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure by Design</h4>
              <p className="text-gray-600">
                All data is encrypted and stored securely with industry-standard protection
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-safe-green/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-safe-green" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Consent Required</h4>
              <p className="text-gray-600">
                Children must approve device monitoring - transparency is key to trust
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-warning-orange/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-warning-orange" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Family Focused</h4>
              <p className="text-gray-600">
                Tools designed to build healthy digital habits, not just restrictions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-trust-blue rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold">Knets</span>
            </div>
            <div className="text-sm text-gray-400">
              Built with families in mind. Privacy first.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
