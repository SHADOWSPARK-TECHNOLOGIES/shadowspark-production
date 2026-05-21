type RegionGreeting = {
  greeting: string;
  dialect: string;
};

export function getRegionalContext(city?: string): RegionGreeting {
  const lowercaseCity = city?.toLowerCase() || "";

  // Lagos / Southwest (Yoruba)
  if (lowercaseCity.includes("lagos") || lowercaseCity.includes("ibadan")) {
    return { greeting: "Ẹ káàbọ̀", dialect: "Yoruba" };
  }
  // Port Harcourt / Southeast (Igbo / Pidgin)
  if (lowercaseCity.includes("port harcourt") || lowercaseCity.includes("enugu")) {
    return { greeting: "Nnọọ", dialect: "Igbo" };
  }
  // Kano / Abuja / North (Hausa)
  if (lowercaseCity.includes("kano") || lowercaseCity.includes("abuja") || lowercaseCity.includes("kaduna")) {
    return { greeting: "Sannu", dialect: "Hausa" };
  }

  // Fallback: Professional Nigerian English / Pidgin
  return { greeting: "Welcome", dialect: "Nigerian English" };
}