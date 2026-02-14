export const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const getDaysUntil = (d) => {
  const t = new Date(d);
  const today = new Date();
  t.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((t - today) / 86400000);
};
