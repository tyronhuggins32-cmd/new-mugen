/* New Mugen V9: shared visual-effect rules for Square's actual combo meter.
 * The damage multiplier still starts after three Square taps; particles,
 * streaks and cinematic punch flares unlock only at displayed COMBO 5.
 * Special moves and rival attacks retain their own effects.
 */
(function(root){
 "use strict";
 const punches=Object.freeze(["light","cross","body","upper"]);
 const isSquarePunch=(fighter,type=fighter?.currentAttack?.())=>
   Boolean(fighter && !fighter.cpu && punches.includes(type));
 function meter(fighter){
   if(!fighter?.comboActive || !(fighter.comboTime>0))return 0;
   return Math.max(3,(fighter.squarePresses||0)+Math.max(0,(fighter.comboHits||0)-1));
 }
 function ready(fighter){return meter(fighter)>=5;}
 function allows(fighter,type=fighter?.currentAttack?.()){
   return !isSquarePunch(fighter,type) || ready(fighter);
 }
 root.MugenComboFX=Object.freeze({punches,isSquarePunch,meter,ready,allows});
})(typeof window==="undefined"?globalThis:window);
