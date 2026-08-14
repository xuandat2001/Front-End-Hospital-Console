import { useEffect, useMemo, useState } from "react";
import { appointmentService } from "../../../services/appointmentBooking/appointmentApi";
import { appointmentQuery } from "../../../services/appointmentBooking/appointmentQueryCache";

const loaders = {
  performance: appointmentService.getAppointmentPerformance,
  planning: appointmentService.getAppointmentPlanning,
  reports: appointmentService.getAppointmentReports,
};

export default function useAppointmentAnalyticsQuery(type, params = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const serializedParams = JSON.stringify(params);
  const stableParams = useMemo(() => JSON.parse(serializedParams), [serializedParams]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (active) setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const response = await appointmentQuery({
          key: [`appointment-${type}`, stableParams],
          queryFn: () => loaders[type](stableParams),
          staleTime: 30_000,
        });
        if (active) setState({ data: response.data || {}, loading: false, error: null });
      } catch (error) {
        if (active) setState({ data: null, loading: false, error });
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [stableParams, type]);

  return state;
}
