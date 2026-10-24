# test262

`data/test262.jsonl`, `data/test262-lone-surrogates.jsonl` and `data/exec/test262.jsonl` hold patterns and texts taken
from test262, the ECMAScript conformance test suite (https://github.com/tc39/test262), at commit
d53ebc8b1931d9f1541e43d59650776e4b766248. Each record names, in its `test262` field, the test files it was taken from.
The answers are V8's, and not part of test262.

Those patterns and texts are used under test262's licence, which is below, as it is in test262's `LICENSE` file. The
rest of this repository is under the MIT licence in [LICENSE](LICENSE).

`test262.js` and `test262-exec.js` write this file. Each test file of test262 carries a copyright line of its own and
says that it is governed by the licence below. These are the lines of the 1819 files the records were taken from:

- Copyright (C) 2015 André Bargull.
- Copyright (C) 2015 Zirak.
- Copyright (C) 2015 the V8 project authors.
- Copyright (C) 2016 Aleksey Shvayka.
- Copyright (C) 2016 the V8 project authors.
- Copyright (C) 2017 André Bargull.
- Copyright (C) 2017 Leonardo Balter.
- Copyright (C) 2017 Valerie Young.
- Copyright (C) 2017 the V8 project authors.
- Copyright (C) 2018 Igalia S. L.
- Copyright (C) 2018 Leo Balter.
- Copyright (C) 2018 Peter Wong.
- Copyright (C) 2019 Leo Balter.
- Copyright (C) 2019 Mike Pennisi.
- Copyright (C) 2020 Alexey Shvayka.
- Copyright (C) 2020 Apple Inc.
- Copyright (C) 2020 ExE Boss.
- Copyright (C) 2020 Rick Waldron.
- Copyright (C) 2021 Richard Gibson.
- Copyright (C) 2021 Ron Buckton and the V8 project authors.
- Copyright (C) 2022 Igalia, S.L.
- Copyright (C) 2022 Mathias Bynens, Ron Buckton, and the V8 project authors.
- Copyright (C) 2023 Kevin Gibbons.
- Copyright (C) 2023 Richard Gibson.
- Copyright (C) 2024 Aurèle Barrière.
- Copyright (C) 2024 Igalia, S.L.
- Copyright (C) 2024 Tan Meng.
- Copyright (C) 2025 Luca Casonato.
- Copyright (C) 2026 hexbinoct.
- Copyright (c) 2012 Ecma International.
- Copyright 2009 the Sputnik authors.
- Copyright 2011 the Sputnik authors.
- Copyright 2015 the V8 project authors.
- Copyright 2017 Aleksey Shvayka.
- Copyright 2017 the V8 project authors.
- Copyright 2018 Leonardo Balter.
- Copyright 2018 Mathias Bynens.
- Copyright 2018 the V8 project authors.
- Copyright 2019 Ron Buckton.
- Copyright 2022 Igalia S.L.
- Copyright 2022 Igalia, S.L.
- Copyright 2022 Kevin Gibbons.
- Copyright 2023 Mathias Bynens.
- Copyright 2023 Ron Buckton.
- Copyright 2024 Daniel Kwan.
- Copyright 2024 Mathias Bynens.
- Copyright 2025 Mathias Bynens.

## test262's licence

```text
Test262: ECMAScript Test Suite ("Software") is protected by copyright and is being 
made available under the  "BSD License", included below. This Software may be subject to third party rights (rights 
from parties other than Ecma International), including patent rights, and no licenses under such third party rights 
are granted under this license even if the third party concerned is a member of Ecma International.  SEE THE ECMA 
CODE OF CONDUCT IN PATENT MATTERS AVAILABLE AT https://www.ecma-international.org/ipr FOR 
INFORMATION REGARDING THE LICENSING OF PATENT CLAIMS THAT ARE REQUIRED TO IMPLEMENT ECMA INTERNATIONAL STANDARDS*.

Copyright (C) 2012 Ecma International
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the 
following conditions are met:
1.   Redistributions of source code must retain the above copyright notice, this list of conditions and the following 
     disclaimer.
2.   Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the 
     following disclaimer in the documentation and/or other materials provided with the distribution.
3.   Neither the name of the authors nor Ecma International may be used to endorse or promote products derived from 
     this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE ECMA INTERNATIONAL "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT 
SHALL ECMA INTERNATIONAL BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES 
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH 
DAMAGE.

* Ecma International Standards hereafter means Ecma International Standards as well as Ecma Technical Reports
```
