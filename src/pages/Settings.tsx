import { useNavigate } from "react-router-dom";
import { AccountSettings } from "@/components/AccountSettings";

const Settings = () => {
  const navigate = useNavigate();

  return <AccountSettings onBack={() => navigate(-1)} />;
};

export default Settings;
