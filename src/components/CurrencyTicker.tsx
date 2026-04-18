const CurrencyTicker = () => {
  return (
    <div className="w-full">
      <iframe 
        src="//www.exchangerates.org.uk/widget/ER-LRTICKER.php?w=1600&s=1&mc=GBP&mbg=FFFFFF&bs=no&bc=000044&f=verdana&fs=12px&fc=000044&lc=000044&lhc=FE9A00&vc=FE9A00&vcu=008000&vcd=FF0000&" 
        width="100%" 
        height={30} 
        frameBorder={0} 
        scrolling="no" 
        marginWidth={0} 
        marginHeight={0}
        className="w-full"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
};

export default CurrencyTicker;