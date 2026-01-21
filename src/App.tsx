import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TerminalCommandProvider } from "@/contexts/TerminalCommandContext";
import { Navigation } from "./components/Navigation";
import RunScan from "./pages/RunScan";
import SessionDetail from "./pages/SessionDetail";
import EditParticipants from "./pages/EditParticipants";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TerminalCommandProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/" element={<RunScan />} />
            <Route path="/participants" element={<EditParticipants />} />
            <Route path="/session/:sessionId" element={<SessionDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </TerminalCommandProvider>
  </QueryClientProvider>
);

export default App;
