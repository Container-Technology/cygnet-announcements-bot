import pkg from 'date-fns-tz';
const { utcToZonedTime } = pkg;

export const getCET = () => {
    return utcToZonedTime(new Date(), 'Europe/Berlin');
}
