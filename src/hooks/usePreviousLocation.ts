import { useRef } from "react";
// import { Location } from "react-router-dom";

// rewriting the below to base the hook on pathname property only
const usePreviousPath = (pathname: string) => {
  console.log('In usePreviousLocation');
  const currentPathRef = useRef(pathname); // pathname arg only relevant on initial render - ignored after
  const prevPathRef = useRef<string>()
  console.log(`pathname = ${pathname}`);
  console.log(`currentPathRef.current = ${currentPathRef.current}`);
  console.log(`prevPathRef.current = ${prevPathRef.current}`);
  console.log(`currentPathRef.current !== pathname: ${currentPathRef.current !== pathname}`)

  if (currentPathRef.current !== pathname) {
    console.log('Updating prevPathRef.current & currentPathRef');
    prevPathRef.current = currentPathRef.current;
    currentPathRef.current = pathname;
  }

  return prevPathRef.current;
}

export default usePreviousPath;

// // Custom hook to track the previous location
// const usePreviousLocation = (location: Location) => {
//   const currentLocRef = useRef(location)
//   const prevLocRef = useRef<Location | null>();

// //   // here is another way.
// //   // note that "useEffect's are triggered after a render completes"
// //   useEffect(() => {
// //     prevLocRef.current = location;
// //   }, [location]);
// //   // should be able to replace the following if statement with this section 

//   console.log('In usePreviousLocation');
//   console.log('location is: ');
//   console.table(location);
//   console.log(`location.pathname = ${location.pathname}`)
//   // console.log(`currentLocRef = ${currentLocRef.current}`);
//   console.log('currentLocRef.current is:');
//   console.table(currentLocRef.current);
//   console.log(`currentLocRef.current.pathname = ${currentLocRef.current.pathname}`)
//   // console.log(`prevLocRef = ${prevLocRef.current}`)
//   // console.log(`prevLocRef.current.pathname = ${prevLocRef.current?.pathname}`)
//   console.log(`currentLocRef.current !== location: ${currentLocRef.current !== location}`)
//   console.log(`currentLocRef.current.pathname !== location.pathname: ${currentLocRef.current.pathname !== location.pathname}`)

//   if (currentLocRef.current !== location) {
//   // as can be gathered from above, the location objects will be different on first few renders; using pathname will be more reliable
//   // if (currentLocRef.current.pathname !== location.pathname) {
//     console.log('updating prevLocRef.current & currentLocRef.current')
//     prevLocRef.current = currentLocRef.current;
//     currentLocRef.current = location;
//   }

//   return prevLocRef.current;
// };

// export default usePreviousLocation;