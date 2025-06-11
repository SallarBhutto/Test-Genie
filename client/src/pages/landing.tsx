import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, Users, BarChart3, Zap, Target } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              QualityBytes
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {/* <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link> */}
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            Enterprise-Grade Test Management
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Streamline Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Testing Workflow</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            QualityBytes is a comprehensive test management platform by SamosaLabs that helps teams organize, execute, and track testing activities with precision and efficiency.
          </p>
          <div className="flex justify-center space-x-4">
            {/* <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Start Free Trial
              </Button>
            </Link> */}
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="container mx-auto px-4 py-4 text-center">
        <span className="inline-block border-t border-gray-300 dark:border-gray-700 w-24 mb-2" />
        {/* <p className="text-sm text-gray-500 dark:text-gray-400">Explore Platform Features</p> */}
      </div>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need for Test Management
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            From test case creation to defect tracking, QualityBytes provides all the tools your team needs to deliver quality software.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Test Case Management</CardTitle>
              <CardDescription>
                Create, organize, and manage test cases with hierarchical project structure and detailed tracking.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Test Execution</CardTitle>
              <CardDescription>
                Execute test runs efficiently with real-time progress tracking and comprehensive result recording.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Defect Tracking</CardTitle>
              <CardDescription>
                Track and manage defects with detailed reporting, priority assignments, and resolution workflows.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Generate comprehensive reports and analytics to gain insights into your testing performance.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Enable seamless collaboration with role-based access, user management, and activity tracking.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <CardTitle>Azure Integration</CardTitle>
              <CardDescription>
                Seamlessly sync bugs with your Azure DevOps projects for unified project management.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Testing Process?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join teams worldwide who trust TestGenie to deliver quality software faster and more efficiently.
          </p>
          <div className="flex justify-center space-x-4">
            {/* <Link href="/signup">
              <Button size="lg" variant="secondary">
                Get Started Now
              </Button>
            </Link> */}
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
            {/* <p className="text-blue-100 text-sm flex items-center">
              Demo credentials: admin / admin
            </p> */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t py-8">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 space-y-2">
          <p>&copy; 2024 TestGenie. All rights reserved by SamosaLabs.</p>
          <p>
            For queries or issues, contact us at{" "}
            <a
              href="mailto:info@samosalabs.com"
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
            >
              info@samosalabs.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}