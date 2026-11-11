import { Languages } from "lucide-react";
import {tr,useLanguage,setLanguage,type Language} from "./i18n";
export function LanguageSwitcher(){const language=useLanguage();return <label className="language-switcher" title={tr("Bahasa sistem")}><Languages size={16}/><select aria-label={tr("Bahasa sistem")} value={language} onChange={event=>setLanguage(event.target.value as Language)}><option value="id">Indonesia</option><option value="en">English</option></select></label>}
