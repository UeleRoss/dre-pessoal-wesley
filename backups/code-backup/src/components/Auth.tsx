
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { authService, type LocalUser } from "@/services/auth-service";

interface AuthProps {
  onAuthChange: (user: LocalUser | null) => void;
}

const Auth = ({ onAuthChange }: AuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        const tempPassword = await authService.requestPasswordReset(email);
        toast({
          title: "Senha temporária criada!",
          description: `Use a senha ${tempPassword} para entrar e troque em seguida.`,
        });
        setIsResetPassword(false);
      } else if (isLogin) {
        const user = await authService.signIn(email, password);
        onAuthChange(user);
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta!",
        });
      } else {
        const user = await authService.signUp(email, password);
        onAuthChange(user);
        toast({
          title: "Conta criada com sucesso!",
          description: "Você já pode acessar o modo offline.",
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {isResetPassword ? "Recuperar Senha" : isLogin ? "Entrar" : "Criar Conta"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            {!isResetPassword && (
              <div>
                <label className="block text-sm font-medium mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : 
               isResetPassword ? "Enviar email de recuperação" :
               isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            {!isResetPassword ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-blue-600 hover:underline block"
                >
                  {isLogin ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
                </button>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setIsResetPassword(true)}
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsResetPassword(false);
                  setIsLogin(true);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Voltar ao login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
